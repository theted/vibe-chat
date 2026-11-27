/**
 * Dead-air recovery (issue #311): a person's message that no AI answers is
 * reported once the room is truly quiet, with the AI to hand it to.
 */

import { afterEach, describe, expect, it } from "bun:test";
import { ChatOrchestrator } from "@/orchestrator/ChatOrchestrator.js";
import { UnansweredWatch } from "@/orchestrator/UnansweredWatch.js";
import type { IAIService } from "@/types/index.js";
import type { ContextMessage } from "@/types/orchestrator.js";
import {
  describeUnanswered,
  type UnansweredMessage,
} from "@/utils/orchestrator/unanswered.js";

const ROOM = "default";
const QUIET_MS = 30;
const RECHECK_MS = 10;
// Long enough for a scheduled reply to be generated and posted
const MENTION_SETTLE_MS = 5_000;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fromPerson = (content: string, extra: Partial<ContextMessage> = {}) =>
  ({
    id: `msg-${content.length}`,
    sender: "Ada",
    displayName: "Ada",
    senderType: "user",
    content,
    roomId: ROOM,
    ...extra,
  }) as ContextMessage;

const ai = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  name: id,
  displayName: id,
  alias: id,
  normalizedAlias: id.replace(/[^a-z0-9]/g, ""),
  isActive: true,
  ...extra,
});

describe("UnansweredWatch", () => {
  const setup = (
    overrides: { busy?: () => boolean; speak?: () => boolean } = {},
  ) => {
    const reports: ContextMessage[] = [];
    const watch = new UnansweredWatch({
      quietMs: QUIET_MS,
      recheckMs: RECHECK_MS,
      cooldownMs: 1_000,
      isBusy: overrides.busy ?? (() => false),
      canSpeak: overrides.speak ?? (() => true),
      onUnanswered: (_roomId, message) => reports.push(message),
    });
    return { watch, reports };
  };

  it("reports a message nobody answered once the quiet time has passed", async () => {
    const { watch, reports } = setup();
    const message = fromPerson("Anyone?");
    watch.watch(ROOM, message);

    await wait(QUIET_MS / 2);
    expect(reports).toHaveLength(0);
    await wait(QUIET_MS);
    expect(reports).toEqual([message]);
    expect(watch.isWatching(ROOM)).toBe(false);
  });

  it("stays quiet when an AI answers in time", async () => {
    const { watch, reports } = setup();
    watch.watch(ROOM, fromPerson("Anyone?"));
    watch.markAnswered(ROOM);

    await wait(QUIET_MS * 2);
    expect(reports).toHaveLength(0);
  });

  it("waits while replies are pending, so a timing-out model gets its chance first", async () => {
    let isBusy = true;
    const { watch, reports } = setup({ busy: () => isBusy });
    watch.watch(ROOM, fromPerson("Anyone?"));

    await wait(QUIET_MS + RECHECK_MS * 3);
    expect(reports).toHaveLength(0);
    expect(watch.isWatching(ROOM)).toBe(true);

    // The call timed out and freed its slot, and nobody posted
    isBusy = false;
    await wait(RECHECK_MS * 3);
    expect(reports).toHaveLength(1);
  });

  it("never wakes AIs that were put to sleep", async () => {
    const { watch, reports } = setup({ speak: () => false });
    watch.watch(ROOM, fromPerson("Anyone?"));

    await wait(QUIET_MS * 2);
    expect(reports).toHaveLength(0);
  });

  it("reports a room at most once per cooldown", async () => {
    const { watch, reports } = setup();
    watch.watch(ROOM, fromPerson("First?"));
    await wait(QUIET_MS * 2);
    watch.watch(ROOM, fromPerson("Second one?"));
    await wait(QUIET_MS * 2);

    expect(reports.map((message) => message.content)).toEqual(["First?"]);
  });

  it("only checks the room's latest message", async () => {
    const { watch, reports } = setup();
    watch.watch(ROOM, fromPerson("First?"));
    await wait(QUIET_MS / 2);
    const latest = fromPerson("Actually, this one?");
    watch.watch(ROOM, latest);

    await wait(QUIET_MS * 2);
    expect(reports).toEqual([latest]);
  });

  it("does nothing when turned off", async () => {
    const reports: ContextMessage[] = [];
    const watch = new UnansweredWatch({
      quietMs: 0,
      isBusy: () => false,
      canSpeak: () => true,
      onUnanswered: (_roomId, message) => reports.push(message),
    });
    watch.watch(ROOM, fromPerson("Anyone?"));

    await wait(QUIET_MS);
    expect(reports).toHaveLength(0);
  });
});

describe("describeUnanswered", () => {
  const first = <T>(items: T[]) => items[0];
  const roomAIs = [ai("claude"), ai("gpt-6-2-astra"), ai("gemini")];

  it("hands a direct mention that went unanswered to another AI", () => {
    const message = fromPerson("@claude what do you think?", {
      mentionsNormalized: ["claude"],
    });
    const result = describeUnanswered(ROOM, message, roomAIs, first);

    expect(result.reason).toBe("mention-unanswered");
    expect(result.silentAIIds).toEqual(["claude"]);
    expect(result.handoffAIId).toBe("gpt-6-2-astra");
  });

  it("hands a broad room question to any free AI", () => {
    const result = describeUnanswered(
      ROOM,
      fromPerson("Does anyone know a good pun?"),
      [ai("claude", { isGenerating: true }), ai("gemini")],
      first,
    );

    expect(result.reason).toBe("no-takers");
    expect(result.silentAIIds).toEqual([]);
    expect(result.handoffAIId).toBe("gemini");
  });

  it("routes a near-miss handle to the AI it most likely meant", () => {
    const result = describeUnanswered(
      ROOM,
      fromPerson("@gpt-6-2-astr are you there?"),
      roomAIs,
      first,
    );

    expect(result.reason).toBe("near-miss-handle");
    expect(result.nearMiss).toEqual({
      token: "gpt-6-2-astr",
      suggestion: "gpt-6-2-astra",
    });
    expect(result.handoffAIId).toBe("gpt-6-2-astra");
  });

  it("retries the only AI in a 1-1 chat", () => {
    const result = describeUnanswered(
      "private:ada:claude",
      fromPerson("Hello?"),
      [ai("claude")],
      first,
    );

    expect(result.reason).toBe("no-takers");
    expect(result.handoffAIId).toBe("claude");
  });

  it("names nobody when every AI is busy", () => {
    const result = describeUnanswered(
      ROOM,
      fromPerson("Hello?"),
      [ai("claude", { isGenerating: true })],
      first,
    );

    expect(result.handoffAIId).toBeNull();
  });
});

describe("ChatOrchestrator message-unanswered", () => {
  let orchestrator: ChatOrchestrator;

  afterEach(() => orchestrator?.cleanup());

  const addAI = (id: string, generateResponse: () => Promise<unknown>) => {
    const service = {
      config: {},
      generateResponse,
      getModel: () => `${id}-model`,
    } as unknown as IAIService;
    orchestrator.aiServices.set(id, { ...ai(id), service });
    orchestrator.activeAIs.push(id);
  };

  const setup = () => {
    orchestrator = new ChatOrchestrator({
      unansweredQuietMs: 200,
      unansweredRecheckMs: 50,
      // Tiny delays so replies are scheduled and settle within the test
      minUserResponseDelay: 1,
      maxUserResponseDelay: 2,
      minBackgroundDelay: 1,
      maxBackgroundDelay: 2,
      minDelayBetweenAI: 1,
      maxDelayBetweenAI: 2,
    });
    orchestrator.stopBackgroundConversation();
    const events: UnansweredMessage[] = [];
    orchestrator.on("message-unanswered", (event: UnansweredMessage) =>
      events.push(event),
    );
    // Generation failures are expected here; keep them out of the output
    orchestrator.on("ai-error", () => undefined);
    return events;
  };

  it("reports a mention whose AI failed, naming another AI to take it", async () => {
    const events = setup();
    addAI("broken", async () => {
      throw new Error("provider down");
    });
    addAI("healthy", async () => "Happy to help.");

    await orchestrator.handleMessage(
      fromPerson("@broken can you check this?", { id: "ask-1" }),
    );
    // Mention replies wait a couple of seconds before they're generated
    await wait(MENTION_SETTLE_MS);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      roomId: ROOM,
      reason: "mention-unanswered",
      silentAIIds: ["broken"],
      handoffAIId: "healthy",
    });
    expect(events[0].message.id).toBe("ask-1");
    orchestrator.stopBackgroundConversation();
  }, 10_000);

  it("stays quiet when the room answers", async () => {
    const events = setup();
    addAI("healthy", async () => "Here you go.");

    await orchestrator.handleMessage(fromPerson("Anyone around?"));
    await wait(MENTION_SETTLE_MS);

    expect(events).toHaveLength(0);
    orchestrator.stopBackgroundConversation();
  }, 10_000);
});

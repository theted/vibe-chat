/**
 * End to end through ChatOrchestrator with mock AIs: a person's quote-reply
 * to a model is answered by that model with the quote in its prompt, and a
 * model's [reply #n] marker becomes a quote on its message.
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import type FakeTimers from "@sinonjs/fake-timers";
import type { ChatOrchestrator } from "@ai-chat/core";
import {
  createEventCollector,
  createTestOrchestrator,
  installFakeClock,
  installMockRegistry,
  tickUntil,
  type CollectedEvents,
  type MockAIService,
} from "../helpers/orchestratorTestUtils.js";

const ROOM = "default";
// Long enough that background chatter never interferes
const NO_BACKGROUND = {
  minBackgroundDelay: 10_000_000,
  maxBackgroundDelay: 10_000_000,
};

type BroadcastMessage = {
  id?: string;
  senderType?: string;
  aiId?: string;
  content: string;
  replyToMessageId?: string | null;
  replyToSender?: string | null;
};

let clock: FakeTimers.InstalledClock;
let restoreRegistry: () => void;
let orchestrator: ChatOrchestrator;
let events: CollectedEvents;
let broadcasts: BroadcastMessage[];

beforeEach(async () => {
  clock = installFakeClock();
  restoreRegistry = installMockRegistry();
  ({ orchestrator } = await createTestOrchestrator({
    aiCount: 4,
    ...NO_BACKGROUND,
  }));
  events = createEventCollector(orchestrator);
  broadcasts = [];
  orchestrator.on("message-broadcast", ({ message }) =>
    broadcasts.push(message),
  );
});

afterEach(() => {
  orchestrator.cleanup();
  restoreRegistry();
  clock.uninstall();
});

const aiByName = (displayName: string) => {
  const ai = [...orchestrator.aiServices.values()].find(
    (candidate) => candidate.displayName === displayName,
  );
  if (!ai) throw new Error(`No AI named ${displayName}`);
  return ai;
};

const aiReplies = () =>
  broadcasts.filter((message) => message.senderType === "ai");

describe("quote-replies", () => {
  it("a person quoting a model is answered by that model, which sees the quote", async () => {
    const quotedAI = aiByName("MockAI-2");
    await orchestrator.handleMessage({
      id: "ai-1",
      sender: "MockAI-2",
      displayName: "MockAI-2",
      senderType: "ai",
      aiId: quotedAI.id,
      normalizedAlias: quotedAI.normalizedAlias,
      roomId: ROOM,
      content: "Tabs beat spaces.",
    });

    const replyFields = orchestrator.getReplyFields(ROOM, "ai-1");
    expect(replyFields?.replyToSender).toBe("MockAI-2");

    orchestrator.addMessage({
      id: "person-1",
      sender: "Ada",
      senderType: "user",
      roomId: ROOM,
      content: "Why though?",
      ...replyFields,
    });
    await tickUntil(clock, () => events.aiResponses.length > 0, 10_000);
    await clock.tickAsync(30_000);

    expect(events.aiResponses.map((response) => response.aiId)).toEqual([
      quotedAI.id,
    ]);
    expect(aiReplies().at(-1)?.replyToMessageId).toBe("person-1");

    const prompt = (quotedAI.service as MockAIService).lastPrompt
      .map((turn) => turn.content)
      .join("\n");
    expect(prompt).toContain("Tabs beat spaces.");
    expect(prompt).toContain('quote-replies to your earlier message: "Tabs');
  });

  it("a model's [reply #n] quotes that message and leaves the marker out", async () => {
    for (const ai of orchestrator.aiServices.values()) {
      Object.assign(ai.service as MockAIService, {
        performGenerateResponse: async () => ({
          content: "[reply #1] Back to the first point.",
        }),
      });
    }

    orchestrator.addMessage({
      id: "person-1",
      sender: "Ada",
      senderType: "user",
      roomId: ROOM,
      content: "First point",
    });
    await tickUntil(clock, () => aiReplies().length > 0, 10_000);

    const [reply] = aiReplies();
    expect(reply.replyToMessageId).toBe("person-1");
    expect(reply.replyToSender).toBe("Ada");
    expect(reply.content).toBe("Back to the first point.");
  });

  it("can't quote a message from another room", async () => {
    orchestrator.addMessage({
      id: "private-1",
      sender: "Ada",
      senderType: "user",
      roomId: "private:Ada:secret",
      content: "Just between us",
    });
    await clock.tickAsync(50);

    expect(orchestrator.getReplyFields(ROOM, "private-1")).toBeNull();
  });
});

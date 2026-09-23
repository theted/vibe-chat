/**
 * Integration Tests: private 1-1 rooms
 *
 * Drives the real orchestrator (mocked AI services, fake clock) to check the
 * two promises a private chat makes: exactly one reply per user message from
 * the chosen model, and no visibility into the main room's conversation.
 *
 * The main room keeps chatting in the background throughout - that is the
 * point of the app - so every assertion here filters on the private room.
 */

import { afterEach, beforeEach, describe, it, expect } from "bun:test";
import type FakeTimers from "@sinonjs/fake-timers";
import {
  installFakeClock,
  installMockRegistry,
  createTestOrchestrator,
  createEventCollector,
  simulateUserMessage,
  tickUntil,
  type CollectedEvents,
} from "../helpers/orchestratorTestUtils.js";
import type { ChatOrchestrator } from "@ai-chat/core";

const PRIVATE_ROOM = "private:TestUser:PRIVATE_AI";
const PUBLIC_TOPIC = "public plans for the weekend";
const PRIVATE_SECRET = "my secret";

let clock: FakeTimers.InstalledClock;
let restoreRegistry: () => void;
let orchestrator: ChatOrchestrator;
let events: CollectedEvents;
let privateAiId: string;

const privateReplies = () =>
  events.aiResponses.filter((event) => event.roomId === PRIVATE_ROOM);

beforeEach(async () => {
  clock = installFakeClock();
  restoreRegistry = installMockRegistry();
  // The main room's background chatter shares one response queue with the
  // private room, so leaving it on makes these assertions a race. Pushing the
  // background delays past any window these tests tick keeps the queue quiet
  // without disabling the loop (a user message would restart it anyway).
  ({ orchestrator } = await createTestOrchestrator({
    aiCount: 4,
    maxAIMessages: 1_000,
    maxConcurrentResponses: 8,
    minBackgroundDelay: 10_000_000,
    maxBackgroundDelay: 10_000_100,
  }));
  events = createEventCollector(orchestrator);

  // Scope the room the way the server does when a user opens a 1-1 chat
  privateAiId = orchestrator.activeAIs[0];
  orchestrator.setRoomAllowedAIs(PRIVATE_ROOM, [privateAiId]);
  orchestrator.setRoomDirectOnly(PRIVATE_ROOM, true);
});

afterEach(() => {
  orchestrator.cleanup();
  clock.uninstall();
  restoreRegistry();
});

describe("private room conversations", () => {
  it("answers each user message exactly once, from the chosen model", async () => {
    simulateUserMessage(orchestrator, PRIVATE_ROOM, "just between us");
    await tickUntil(clock, () => privateReplies().length > 0);
    await clock.tickAsync(2_000);

    expect(privateReplies()).toHaveLength(1);
    expect(privateReplies()[0].aiId).toBe(privateAiId);

    simulateUserMessage(orchestrator, PRIVATE_ROOM, "and again");
    await tickUntil(clock, () => privateReplies().length > 1);
    await clock.tickAsync(2_000);

    expect(privateReplies()).toHaveLength(2);
    expect(privateReplies()[1].aiId).toBe(privateAiId);
  });

  it("stays quiet between user messages", async () => {
    simulateUserMessage(orchestrator, PRIVATE_ROOM, "hello there");
    await tickUntil(clock, () => privateReplies().length > 0);

    // Well past the background-chatter delays the main room keeps using
    await clock.tickAsync(60_000);

    expect(privateReplies()).toHaveLength(1);
  });

  it("does not show the private model the main room's conversation", async () => {
    simulateUserMessage(orchestrator, "default", PUBLIC_TOPIC);
    // Whether the main room replies is up to its random responder pick, so
    // wait on the message landing in context rather than on an answer
    await tickUntil(
      clock,
      () =>
        orchestrator.contextManager.getContextForAI(50, "default").length > 0,
    );

    expect(
      orchestrator.contextManager.getContextForAI(50, PRIVATE_ROOM),
    ).toHaveLength(0);

    simulateUserMessage(orchestrator, PRIVATE_ROOM, "private question");
    await tickUntil(clock, () => privateReplies().length > 0);

    const privateContext = orchestrator.contextManager.getContextForAI(
      50,
      PRIVATE_ROOM,
    );
    expect(privateContext[0]?.content).toBe("private question");
    expect(
      privateContext.some((message) => message.content.includes(PUBLIC_TOPIC)),
    ).toBe(false);
  });

  it("keeps private messages out of the main room's context", async () => {
    simulateUserMessage(orchestrator, PRIVATE_ROOM, PRIVATE_SECRET);
    await tickUntil(clock, () => privateReplies().length > 0);
    await clock.tickAsync(2_000);

    const publicContext = orchestrator.contextManager.getContextForAI(
      50,
      "default",
    );
    expect(
      publicContext.some((message) => message.content.includes(PRIVATE_SECRET)),
    ).toBe(false);
  });
});

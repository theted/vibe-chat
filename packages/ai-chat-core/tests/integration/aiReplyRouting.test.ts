/**
 * End to end through ChatOrchestrator with mock AIs: per-room AI budgets,
 * and @mentions answered by exactly the AI that was mentioned.
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import type FakeTimers from "@sinonjs/fake-timers";
import type { ChatOrchestrator } from "@ai-chat/core";
import {
  createEventCollector,
  createTestOrchestrator,
  installFakeClock,
  installMockRegistry,
  simulateUserMessage,
  tickUntil,
  tickUntilSleep,
  type CollectedEvents,
} from "../helpers/orchestratorTestUtils.js";

const OTHER_ROOM = "room-2";
// Long enough that background chatter never interferes
const NO_BACKGROUND = { minBackgroundDelay: 10_000_000, maxBackgroundDelay: 10_000_000 };

let clock: FakeTimers.InstalledClock;
let restoreRegistry: () => void;
let orchestrator: ChatOrchestrator;
let events: CollectedEvents;

beforeEach(() => {
  clock = installFakeClock();
  restoreRegistry = installMockRegistry();
});

afterEach(() => {
  orchestrator?.cleanup();
  restoreRegistry();
  clock.uninstall();
});

const aiIdFor = (displayName: string) =>
  [...orchestrator.aiServices.values()].find(
    (ai) => ai.displayName === displayName,
  )?.id;

const repliesIn = (roomId: string) =>
  events.aiResponses.filter((response) => response.roomId === roomId);

describe("AI message budget", () => {
  it("is kept per room: a sleeping room doesn't silence another", async () => {
    ({ orchestrator } = await createTestOrchestrator({
      aiCount: 3,
      maxAIMessages: 2,
      minBackgroundDelay: 30,
      maxBackgroundDelay: 50,
    }));
    events = createEventCollector(orchestrator);

    simulateUserMessage(orchestrator, "default", "Talk amongst yourselves");
    await tickUntilSleep(clock, orchestrator, true, "default");

    simulateUserMessage(orchestrator, OTHER_ROOM, "Anyone here?");
    await tickUntil(clock, () => repliesIn(OTHER_ROOM).length > 0, 10_000);

    expect(orchestrator.getRoomAIStatus("default").isAsleep).toBe(true);
    expect(repliesIn("default")).toHaveLength(2);
  });

  it("counts messages from outside responders like @Chat", async () => {
    ({ orchestrator } = await createTestOrchestrator({
      aiCount: 2,
      maxAIMessages: 2,
      ...NO_BACKGROUND,
    }));

    expect(orchestrator.claimAITurn(OTHER_ROOM)).toBe(true);
    expect(orchestrator.claimAITurn(OTHER_ROOM)).toBe(true);
    expect(orchestrator.claimAITurn(OTHER_ROOM)).toBe(false);
    expect(orchestrator.canAIsSpeak(OTHER_ROOM)).toBe(false);

    simulateUserMessage(orchestrator, OTHER_ROOM, "back again");
    await clock.tickAsync(50);
    expect(orchestrator.canAIsSpeak(OTHER_ROOM)).toBe(true);
  });
});

describe("@mentions", () => {
  it("a person's @mention is answered by that AI alone", async () => {
    ({ orchestrator } = await createTestOrchestrator({
      aiCount: 5,
      ...NO_BACKGROUND,
    }));
    events = createEventCollector(orchestrator);

    simulateUserMessage(orchestrator, "default", "@MockAI-3 what do you think?");
    await tickUntil(clock, () => events.aiResponses.length > 0, 10_000);
    await clock.tickAsync(30_000);

    expect(events.aiResponses.map((response) => response.aiId)).toEqual([
      aiIdFor("MockAI-3"),
    ]);
  });

  it("an AI's @mention is answered by the AI it named", async () => {
    // AI-to-AI replies take the background delay band (sped up for mentions),
    // so keep it finite here and finish before the first background tick
    ({ orchestrator } = await createTestOrchestrator({
      aiCount: 5,
      minBackgroundDelay: 200_000,
      maxBackgroundDelay: 200_000,
    }));
    events = createEventCollector(orchestrator);
    const asker = aiIdFor("MockAI-0");

    await orchestrator.handleMessage({
      sender: "MockAI-0",
      displayName: "MockAI-0",
      senderType: "ai",
      aiId: asker,
      roomId: "default",
      content: "@MockAI-2 do you agree?",
    });
    await tickUntil(clock, () => events.aiResponses.length > 0, 150_000);
    await clock.tickAsync(20_000);

    expect(events.aiResponses.map((response) => response.aiId)).toEqual([
      aiIdFor("MockAI-2"),
    ]);
  });

  it("drops replies still queued for an older message when a person posts again", async () => {
    ({ orchestrator } = await createTestOrchestrator({
      aiCount: 5,
      ...NO_BACKGROUND,
    }));
    events = createEventCollector(orchestrator);

    simulateUserMessage(orchestrator, "default", "first thought");
    // Under the 10ms minimum reply delay these tests use: nothing is due yet
    await clock.tickAsync(5);
    simulateUserMessage(orchestrator, "default", "@MockAI-4 actually, you answer");
    await tickUntil(clock, () => events.aiResponses.length > 0, 10_000);
    await clock.tickAsync(30_000);

    expect(events.aiResponses.map((response) => response.aiId)).toEqual([
      aiIdFor("MockAI-4"),
    ]);
  });
});

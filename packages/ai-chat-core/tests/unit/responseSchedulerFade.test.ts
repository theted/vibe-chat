import { describe, it, expect } from "bun:test";
import type { AIRegistry } from "@/orchestrator/AIRegistry.js";
import type { QueuedResponse } from "@/orchestrator/ResponseQueue.js";
import { ResponseScheduler } from "@/orchestrator/ResponseScheduler.js";

const makeScheduler = (fatigue: number, batches: QueuedResponse[][]) => {
  const services = new Map(
    ["AI_ONE", "AI_TWO", "AI_THREE"].map((id) => [
      id,
      {
        id,
        isActive: true,
        isGenerating: false,
        justResponded: false,
        normalizedAlias: id.toLowerCase(),
        traits: { tempo: 1, chattiness: 1 },
      },
    ]),
  );
  const registry = {
    services,
    activeIds: [...services.keys()],
  } as unknown as AIRegistry;

  return new ResponseScheduler({
    registry,
    getLastMessage: () => undefined,
    filterAIsForRoom: (_roomId, aiIds) => aiIds,
    enqueueBatch: (responses) => batches.push(responses),
    isAsleep: () => false,
    getFatigue: () => fatigue,
    getDelays: () => ({
      minUserResponseDelay: 0,
      maxUserResponseDelay: 1,
      minBackgroundDelay: 0,
      maxBackgroundDelay: 1,
      minDelayBetweenAI: 0,
      maxDelayBetweenAI: 1,
    }),
  });
};

describe("ResponseScheduler fade-out", () => {
  it("never fade-skips responses to user messages, even at full fatigue", () => {
    const batches: QueuedResponse[][] = [];
    const scheduler = makeScheduler(1, batches);
    for (let i = 0; i < 50; i++) {
      scheduler.schedule("default", true);
    }
    expect(batches.length).toBe(50);
  });

  it("skips some background rounds at full fatigue but not all", () => {
    const batches: QueuedResponse[][] = [];
    const scheduler = makeScheduler(1, batches);
    const attempts = 300;
    for (let i = 0; i < attempts; i++) {
      scheduler.schedule("default", false);
    }
    // At full fatigue response probability is MIN_RESPONSE_PROBABILITY (0.25)
    expect(batches.length).toBeGreaterThan(0);
    expect(batches.length).toBeLessThan(attempts * 0.6);
  });

  it("never skips background rounds below the fade start ratio", () => {
    const batches: QueuedResponse[][] = [];
    const scheduler = makeScheduler(0.5, batches);
    for (let i = 0; i < 50; i++) {
      scheduler.schedule("default", false);
    }
    expect(batches.length).toBe(50);
  });
});

describe("ResponseScheduler reopening", () => {
  it("schedules exactly one AI flagged as reopening", () => {
    const batches: QueuedResponse[][] = [];
    const scheduler = makeScheduler(0, batches);
    scheduler.schedule("default", false, { isReopening: true });

    expect(batches.length).toBe(1);
    expect(batches[0].length).toBe(1);
    expect(batches[0][0].options.isReopening).toBe(true);
    expect(batches[0][0].isUserResponse).toBe(false);
  });
});

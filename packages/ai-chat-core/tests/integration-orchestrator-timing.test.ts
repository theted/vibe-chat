/**
 * Integration Tests: ChatOrchestrator Timing Behavior
 *
 * Tests the orchestrator's scheduling, sleep/wake cycles, and concurrency
 * limiting using a mocked AI service and @sinonjs/fake-timers.
 *
 * Approach:
 * - A fake clock replaces setTimeout, clearTimeout, and Date so all timing
 *   is controlled deterministically via clock.tickAsync().
 * - MockAIService responds instantly (no actual API calls).
 * - tickUntil() / tickUntilSleep() advance fake time in steps until the
 *   expected condition is met — no real wall-clock waiting.
 * - Silence-window and 5-minute scenarios are covered by advancing the fake
 *   clock past SILENCE_TIMEOUT (120s) without mutating lastAIMessageTime.
 *
 * Adding new timing tests:
 * 1. The fake clock is installed in beforeEach (before orchestrator creation)
 * 2. Use createTestOrchestrator() with desired config overrides
 * 3. Attach an event collector via createEventCollector()
 * 4. Simulate user messages with simulateUserMessage()
 * 5. Advance time with tickUntil() / tickUntilSleep() / clock.tickAsync()
 * 6. Assert on collected events and orchestrator.messageTracker state
 * 7. The clock is uninstalled in afterEach (after orchestrator.cleanup())
 */

import { afterEach, beforeEach, describe, it, expect } from "bun:test";
import type FakeTimers from "@sinonjs/fake-timers";
import {
  installFakeClock,
  installMockRegistry,
  createTestOrchestrator,
  createEventCollector,
  resetEventCollector,
  simulateUserMessage,
  assertSleepState,
  tickUntil,
  tickUntilSleep,
  type CollectedEvents,
} from "./helpers/orchestratorTestUtils.js";
import type { ChatOrchestrator } from "@ai-chat/core";

let clock: FakeTimers.InstalledClock;
let restoreRegistry: () => void;
let orchestrator: ChatOrchestrator;
let events: CollectedEvents;

beforeEach(() => {
  clock = installFakeClock();
  restoreRegistry = installMockRegistry();
});

afterEach(() => {
  if (orchestrator) {
    orchestrator.cleanup();
  }
  restoreRegistry();
  clock.uninstall();
});

// ---------------------------------------------------------------------------
// Test 1: Single User Message — Response Limit
// ---------------------------------------------------------------------------

describe("Single user message response limit", () => {
  it("generates AI responses that do not exceed maxAIMessages", async () => {
    const maxAIMessages = 6;
    ({ orchestrator } = await createTestOrchestrator({
      aiCount: 5,
      maxAIMessages,
      maxConcurrentResponses: 2,
      minUserResponseDelay: 10,
      maxUserResponseDelay: 30,
      minBackgroundDelay: 40,
      maxBackgroundDelay: 60,
      minDelayBetweenAI: 5,
      maxDelayBetweenAI: 15,
    }));
    events = createEventCollector(orchestrator);

    simulateUserMessage(orchestrator, "room-1", "Hello everyone!");

    // Advance fake time until sleep (orchestrator hit the limit)
    await tickUntilSleep(clock, orchestrator, true);

    // AI responses should have been generated
    expect(events.aiResponses.length).toBeGreaterThan(0);

    // Should not exceed the maxAIMessages limit
    expect(orchestrator.messageTracker.aiMessageCount).toBeLessThanOrEqual(
      maxAIMessages,
    );

    // Sleep event should have fired
    expect(events.sleepEvents.length).toBeGreaterThanOrEqual(1);
  });

  it("staggers responses over time (not all at once)", async () => {
    ({ orchestrator } = await createTestOrchestrator({
      aiCount: 4,
      maxAIMessages: 20,
      maxConcurrentResponses: 1, // Force serial to make staggering visible
      minUserResponseDelay: 50,
      maxUserResponseDelay: 100,
      // Disable background to isolate user-response timing
      minBackgroundDelay: 10_000_000,
      maxBackgroundDelay: 10_000_000,
      minDelayBetweenAI: 30,
      maxDelayBetweenAI: 60,
    }));
    events = createEventCollector(orchestrator);

    simulateUserMessage(orchestrator, "room-1", "What do you think?");

    // Immediately after sending, no responses should exist yet
    // (delays are >= 50ms)
    const earlyCount = events.aiResponses.length;

    // Advance fake time enough for scheduled responses to arrive
    await tickUntil(
      clock,
      () => events.aiResponses.length > earlyCount,
      5_000,
    );

    expect(events.aiResponses.length).toBeGreaterThan(earlyCount);
  });
});

// ---------------------------------------------------------------------------
// Test 2: Multiple Users High Volume
// ---------------------------------------------------------------------------

describe("Multiple users high volume", () => {
  it("controls total AI responses under high message volume (10 users × 10 messages)", async () => {
    const maxAIMessages = 20;
    ({ orchestrator } = await createTestOrchestrator({
      aiCount: 5,
      maxAIMessages,
      maxConcurrentResponses: 2,
      minUserResponseDelay: 10,
      maxUserResponseDelay: 20,
      // Disable background to isolate user-response behavior
      minBackgroundDelay: 10_000_000,
      maxBackgroundDelay: 10_000_000,
      minDelayBetweenAI: 5,
      maxDelayBetweenAI: 10,
    }));
    events = createEventCollector(orchestrator);

    // Simulate 10 users each sending 10 messages (100 total user messages)
    for (let user = 0; user < 10; user++) {
      for (let msg = 0; msg < 10; msg++) {
        simulateUserMessage(
          orchestrator,
          "room-1",
          `Message ${msg + 1} from user ${user + 1}`,
          `User-${user + 1}`,
        );
        // Small gap between user messages (advance fake time)
        await clock.tickAsync(5);
      }
    }

    // Advance until orchestrator sleeps (hit the limit)
    await tickUntilSleep(clock, orchestrator, true);

    // Total AI messages should respect the ceiling
    expect(orchestrator.messageTracker.aiMessageCount).toBeLessThanOrEqual(
      maxAIMessages,
    );

    // Should have entered sleep
    expect(events.sleepEvents.length).toBeGreaterThanOrEqual(1);
  });

  it("respects maxConcurrentResponses limit", async () => {
    const maxConcurrent = 2;
    ({ orchestrator } = await createTestOrchestrator({
      aiCount: 6,
      maxAIMessages: 30,
      maxConcurrentResponses: maxConcurrent,
      minUserResponseDelay: 10,
      maxUserResponseDelay: 20,
      // Short background delay so multiple response waves occur
      minBackgroundDelay: 30,
      maxBackgroundDelay: 50,
      minDelayBetweenAI: 5,
      maxDelayBetweenAI: 10,
    }));
    events = createEventCollector(orchestrator);

    // Track peak concurrency via generating start/stop events
    let currentConcurrent = 0;
    let peakConcurrent = 0;
    orchestrator.on("ai-generating-start", () => {
      currentConcurrent++;
      peakConcurrent = Math.max(peakConcurrent, currentConcurrent);
    });
    orchestrator.on("ai-generating-stop", () => {
      currentConcurrent--;
    });

    // Send multiple messages to trigger many response waves
    simulateUserMessage(orchestrator, "room-1", "Everyone respond!");
    simulateUserMessage(orchestrator, "room-1", "More discussion please!");
    await tickUntil(clock, () => events.aiResponses.length >= 4, 10_000);

    // Responses were generated
    expect(events.aiResponses.length).toBeGreaterThanOrEqual(4);

    // Peak concurrent generations must not exceed the configured limit
    expect(peakConcurrent).toBeLessThanOrEqual(maxConcurrent);

    // The orchestrator's internal counter should not go negative
    expect(orchestrator.activeResponseCount).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// Test 3: Extended Silence Sleep Behavior
// ---------------------------------------------------------------------------

describe("Extended silence sleep behavior", () => {
  it("stops background messages after 2-minute silence window", async () => {
    // Use background delays longer than SILENCE_TIMEOUT (120s) so silence
    // triggers naturally when the background timer fires — no manual
    // lastAIMessageTime mutation needed.
    ({ orchestrator } = await createTestOrchestrator({
      aiCount: 3,
      maxAIMessages: 50, // High limit so sleep isn't from message count
      maxConcurrentResponses: 2,
      minUserResponseDelay: 10,
      maxUserResponseDelay: 20,
      minBackgroundDelay: 150_000, // 2.5 min — fires after SILENCE_TIMEOUT
      maxBackgroundDelay: 160_000,
      minDelayBetweenAI: 5,
      maxDelayBetweenAI: 10,
    }));
    events = createEventCollector(orchestrator);

    // Send a user message to start activity
    simulateUserMessage(orchestrator, "room-1", "Start talking!");

    // Advance until initial user responses arrive
    await tickUntil(clock, () => events.aiResponses.length >= 1, 5_000);
    const responsesAfterInitial = events.aiResponses.length;
    expect(responsesAfterInitial).toBeGreaterThan(0);

    // Snapshot response count after user-response phase completes
    // (all user-response timers are short, so a small extra advance drains them)
    await clock.tickAsync(200);
    const snapshotCount = events.aiResponses.length;

    // Advance past SILENCE_TIMEOUT — background timer fires at ~150-160s
    // and detects timeSinceLastMessage > 120s, so it does NOT generate
    await clock.tickAsync(170_000);

    // No new responses should have been generated after silence
    expect(events.aiResponses.length).toBe(snapshotCount);
  });

  it("covers the full 5-minute silence window", async () => {
    ({ orchestrator } = await createTestOrchestrator({
      aiCount: 3,
      maxAIMessages: 50,
      maxConcurrentResponses: 2,
      minUserResponseDelay: 10,
      maxUserResponseDelay: 20,
      // Background delay > 5 minutes so it fires well after silence
      minBackgroundDelay: 310_000,
      maxBackgroundDelay: 320_000,
      minDelayBetweenAI: 5,
      maxDelayBetweenAI: 10,
    }));
    events = createEventCollector(orchestrator);

    simulateUserMessage(orchestrator, "room-1", "Start talking!");

    // Let initial responses complete
    await tickUntil(clock, () => events.aiResponses.length >= 1, 5_000);
    await clock.tickAsync(200);
    const snapshotCount = events.aiResponses.length;

    // Advance 5 full minutes of fake time
    await clock.tickAsync(300_000);

    // No background messages should have been generated during 5min silence
    expect(events.aiResponses.length).toBe(snapshotCount);

    // Background timer fires at ~310-320s and detects silence
    await clock.tickAsync(30_000);
    expect(events.aiResponses.length).toBe(snapshotCount);
  });
});

// ---------------------------------------------------------------------------
// Test 4: Wake-Sleep Cycle
// ---------------------------------------------------------------------------

describe("Wake-sleep cycle", () => {
  it("resets message count and allows new responses after wake", async () => {
    const maxAIMessages = 4;
    ({ orchestrator } = await createTestOrchestrator({
      aiCount: 3,
      maxAIMessages,
      maxConcurrentResponses: 2,
      minUserResponseDelay: 10,
      maxUserResponseDelay: 20,
      minBackgroundDelay: 30,
      maxBackgroundDelay: 50,
      minDelayBetweenAI: 5,
      maxDelayBetweenAI: 10,
    }));
    events = createEventCollector(orchestrator);

    // Phase 1: Send message, let AIs respond until sleep
    simulateUserMessage(orchestrator, "room-1", "First question");
    await tickUntilSleep(clock, orchestrator, true);

    expect(events.sleepEvents.length).toBeGreaterThanOrEqual(1);
    const sleepResponseCount = events.aiResponses.length;

    // Phase 2: New user message wakes AIs
    const wakeCountBefore = events.wakeEvents.length;
    simulateUserMessage(orchestrator, "room-1", "Second question");

    // With very short delays the orchestrator can wake and re-sleep almost
    // instantly. Verify that a wake event was emitted (durable fact).
    await tickUntil(
      clock,
      () => events.wakeEvents.length > wakeCountBefore,
      10_000,
    );
    expect(events.wakeEvents.length).toBeGreaterThan(wakeCountBefore);

    // Phase 3: Let AIs respond again until second sleep
    await tickUntilSleep(clock, orchestrator, true);

    // Should have generated new responses after waking
    expect(events.aiResponses.length).toBeGreaterThan(sleepResponseCount);

    // Should have slept at least twice (once per user message cycle)
    expect(events.sleepEvents.length).toBeGreaterThanOrEqual(2);
  });

  it("handles rapid wake-sleep-wake cycles", async () => {
    const maxAIMessages = 3;
    ({ orchestrator } = await createTestOrchestrator({
      aiCount: 2,
      maxAIMessages,
      maxConcurrentResponses: 2,
      minUserResponseDelay: 10,
      maxUserResponseDelay: 20,
      minBackgroundDelay: 20,
      maxBackgroundDelay: 40,
      minDelayBetweenAI: 5,
      maxDelayBetweenAI: 10,
    }));
    events = createEventCollector(orchestrator);

    // Rapid cycle: message -> sleep -> message -> sleep -> message
    for (let cycle = 0; cycle < 3; cycle++) {
      simulateUserMessage(orchestrator, "room-1", `Cycle ${cycle + 1}`);
      await tickUntilSleep(clock, orchestrator, true);
    }

    // Should have gone through multiple sleep/wake cycles
    expect(events.sleepEvents.length).toBeGreaterThanOrEqual(3);
    expect(events.wakeEvents.length).toBeGreaterThanOrEqual(2); // First message doesn't wake (already awake)
    expect(events.aiResponses.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Test 5: Configuration Impact
// ---------------------------------------------------------------------------

describe("Configuration impact", () => {
  it("lower maxAIMessages produces fewer responses before sleep", async () => {
    // Run with low limit
    ({ orchestrator } = await createTestOrchestrator({
      aiCount: 3,
      maxAIMessages: 3,
      minUserResponseDelay: 10,
      maxUserResponseDelay: 20,
      minBackgroundDelay: 30,
      maxBackgroundDelay: 50,
      minDelayBetweenAI: 5,
      maxDelayBetweenAI: 10,
    }));
    events = createEventCollector(orchestrator);

    simulateUserMessage(orchestrator, "room-1", "Test low limit");
    await tickUntilSleep(clock, orchestrator, true);

    const lowLimitCount = orchestrator.messageTracker.aiMessageCount;
    expect(lowLimitCount).toBeLessThanOrEqual(3);
    orchestrator.cleanup();

    // Run with higher limit
    ({ orchestrator } = await createTestOrchestrator({
      aiCount: 3,
      maxAIMessages: 10,
      minUserResponseDelay: 10,
      maxUserResponseDelay: 20,
      minBackgroundDelay: 30,
      maxBackgroundDelay: 50,
      minDelayBetweenAI: 5,
      maxDelayBetweenAI: 10,
    }));
    const highEvents = createEventCollector(orchestrator);

    simulateUserMessage(orchestrator, "room-1", "Test higher limit");
    await tickUntilSleep(clock, orchestrator, true);

    const highLimitCount = orchestrator.messageTracker.aiMessageCount;

    // Higher limit should produce more AI messages before sleeping
    expect(highLimitCount).toBeGreaterThanOrEqual(lowLimitCount);
    expect(highLimitCount).toBeLessThanOrEqual(10);
  });

  it("maxConcurrentResponses=1 serializes all responses", async () => {
    ({ orchestrator } = await createTestOrchestrator({
      aiCount: 4,
      maxAIMessages: 20,
      maxConcurrentResponses: 1,
      minUserResponseDelay: 10,
      maxUserResponseDelay: 20,
      minBackgroundDelay: 10_000_000,
      maxBackgroundDelay: 10_000_000,
      minDelayBetweenAI: 5,
      maxDelayBetweenAI: 10,
    }));
    events = createEventCollector(orchestrator);

    // Track peak concurrency to verify serialization
    let currentConcurrent = 0;
    let peakConcurrent = 0;
    orchestrator.on("ai-generating-start", () => {
      currentConcurrent++;
      peakConcurrent = Math.max(peakConcurrent, currentConcurrent);
    });
    orchestrator.on("ai-generating-stop", () => {
      currentConcurrent--;
    });

    simulateUserMessage(orchestrator, "room-1", "Serial test");
    await tickUntil(clock, () => events.aiResponses.length >= 1, 5_000);

    // Responses should have been generated
    expect(events.aiResponses.length).toBeGreaterThan(0);
    // With maxConcurrentResponses=1, peak should never exceed 1
    expect(peakConcurrent).toBeLessThanOrEqual(1);
    expect(orchestrator.activeResponseCount).toBeLessThanOrEqual(1);
  });

  it("disabling background delays prevents background messages", async () => {
    ({ orchestrator } = await createTestOrchestrator({
      aiCount: 3,
      maxAIMessages: 50,
      minUserResponseDelay: 10,
      maxUserResponseDelay: 20,
      // Very large background delays effectively disable background chat
      minBackgroundDelay: 10_000_000,
      maxBackgroundDelay: 10_000_000,
      minDelayBetweenAI: 5,
      maxDelayBetweenAI: 10,
    }));
    events = createEventCollector(orchestrator);

    // Send one message, get direct responses
    simulateUserMessage(orchestrator, "room-1", "Only direct responses");
    await tickUntil(clock, () => events.aiResponses.length >= 1, 5_000);

    const directResponseCount = events.aiResponses.length;
    expect(directResponseCount).toBeGreaterThan(0);

    // Advance time and check for background responses — none should arrive
    // since background delay is 10M ms
    resetEventCollector(events);
    await clock.tickAsync(5_000);

    // No new responses from background conversation
    expect(events.aiResponses.length).toBe(0);
  });
});

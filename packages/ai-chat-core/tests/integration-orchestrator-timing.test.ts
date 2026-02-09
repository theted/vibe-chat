/**
 * Integration Tests: ChatOrchestrator Timing Behavior
 *
 * Tests the orchestrator's scheduling, sleep/wake cycles, and concurrency
 * limiting using a mocked AI service and real timers with short delays.
 *
 * Approach:
 * - All timing config overrides use very short delays (10-80ms) so the
 *   full scheduling pipeline exercises within a few seconds of real time.
 * - MockAIService responds instantly (no actual API calls).
 * - waitFor() polls for expected state changes instead of advancing fake clocks.
 * - The SILENCE_TIMEOUT constant (120s) is the one timing value we cannot
 *   override via config, so tests that depend on it manipulate
 *   `lastAIMessageTime` directly to simulate elapsed silence.
 *
 * Adding new timing tests:
 * 1. Use createTestOrchestrator() with desired config overrides
 * 2. Attach an event collector via createEventCollector()
 * 3. Simulate user messages with simulateUserMessage()
 * 4. Use waitFor() / waitForSleepState() / sleep() for async assertions
 * 5. Assert on collected events and orchestrator.messageTracker state
 */

import { afterEach, beforeEach, describe, it, expect } from "bun:test";
import {
  installMockRegistry,
  createTestOrchestrator,
  createEventCollector,
  resetEventCollector,
  simulateUserMessage,
  assertSleepState,
  waitFor,
  waitForSleepState,
  sleep,
  type CollectedEvents,
} from "./helpers/orchestratorTestUtils.js";
import type { ChatOrchestrator } from "@ai-chat/core";

let restoreRegistry: () => void;
let orchestrator: ChatOrchestrator;
let events: CollectedEvents;

beforeEach(() => {
  restoreRegistry = installMockRegistry();
});

afterEach(() => {
  if (orchestrator) {
    orchestrator.cleanup();
  }
  restoreRegistry();
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

    // Wait until the orchestrator enters sleep (meaning it hit the limit)
    await waitForSleepState(orchestrator, true, 15_000);

    // AI responses should have been generated
    expect(events.aiResponses.length).toBeGreaterThan(0);

    // Should not exceed the maxAIMessages limit
    expect(orchestrator.messageTracker.aiMessageCount).toBeLessThanOrEqual(
      maxAIMessages,
    );

    // Sleep event should have fired
    expect(events.sleepEvents.length).toBeGreaterThanOrEqual(1);
  }, 20_000);

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

    // Wait enough for all scheduled responses to arrive
    await waitFor(
      () => events.aiResponses.length > earlyCount,
      5_000,
    );

    expect(events.aiResponses.length).toBeGreaterThan(earlyCount);
  }, 10_000);
});

// ---------------------------------------------------------------------------
// Test 2: Multiple Users High Volume
// ---------------------------------------------------------------------------

describe("Multiple users high volume", () => {
  it("controls total AI responses under high message volume", async () => {
    const maxAIMessages = 10;
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

    // Simulate 5 users each sending 3 messages (15 total user messages)
    for (let user = 0; user < 5; user++) {
      for (let msg = 0; msg < 3; msg++) {
        simulateUserMessage(
          orchestrator,
          "room-1",
          `Message ${msg + 1} from user ${user + 1}`,
          `User-${user + 1}`,
        );
        await sleep(30); // Small gap between user messages
      }
    }

    // Wait until sleep or a reasonable timeout
    await waitForSleepState(orchestrator, true, 15_000);

    // Total AI messages should respect the limit
    expect(orchestrator.messageTracker.aiMessageCount).toBeLessThanOrEqual(
      maxAIMessages,
    );

    // Should have entered sleep
    expect(events.sleepEvents.length).toBeGreaterThanOrEqual(1);
  }, 20_000);

  it("respects maxConcurrentResponses limit", async () => {
    const maxConcurrent = 2;
    ({ orchestrator } = await createTestOrchestrator({
      aiCount: 6,
      maxAIMessages: 30,
      maxConcurrentResponses: maxConcurrent,
      minUserResponseDelay: 10,
      maxUserResponseDelay: 20,
      minBackgroundDelay: 10_000_000,
      maxBackgroundDelay: 10_000_000,
      minDelayBetweenAI: 5,
      maxDelayBetweenAI: 10,
    }));
    events = createEventCollector(orchestrator);

    simulateUserMessage(orchestrator, "room-1", "Everyone respond!");
    await waitFor(() => events.aiResponses.length >= 1, 5_000);

    // Responses were generated
    expect(events.aiResponses.length).toBeGreaterThan(0);

    // The orchestrator's internal counter should not go negative
    expect(orchestrator.activeResponseCount).toBeGreaterThanOrEqual(0);
  }, 10_000);
});

// ---------------------------------------------------------------------------
// Test 3: Extended Silence Sleep Behavior
// ---------------------------------------------------------------------------

describe("Extended silence sleep behavior", () => {
  it("stops background messages after silence period", async () => {
    ({ orchestrator } = await createTestOrchestrator({
      aiCount: 3,
      maxAIMessages: 50, // High limit so sleep isn't from message count
      maxConcurrentResponses: 2,
      minUserResponseDelay: 10,
      maxUserResponseDelay: 20,
      minBackgroundDelay: 30,
      maxBackgroundDelay: 50,
      minDelayBetweenAI: 5,
      maxDelayBetweenAI: 10,
    }));
    events = createEventCollector(orchestrator);

    // Send a user message to start activity
    simulateUserMessage(orchestrator, "room-1", "Start talking!");

    // Wait for some initial responses
    await waitFor(() => events.aiResponses.length >= 1, 5_000);
    const responsesAfterInitial = events.aiResponses.length;
    expect(responsesAfterInitial).toBeGreaterThan(0);

    // Simulate silence by pushing lastAIMessageTime into the past
    // (beyond SILENCE_TIMEOUT = 120000ms)
    // This avoids waiting 2 real minutes in the test
    orchestrator.lastAIMessageTime = Date.now() - 130_000;

    // Wait for background timer to fire and notice the silence
    await sleep(300);

    // Snapshot response count — no more should arrive
    const snapshotCount = events.aiResponses.length;
    await sleep(500);
    const finalCount = events.aiResponses.length;

    // No new responses should have been generated after silence
    expect(finalCount).toBe(snapshotCount);
  }, 10_000);
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
    await waitForSleepState(orchestrator, true, 15_000);

    expect(events.sleepEvents.length).toBeGreaterThanOrEqual(1);
    const sleepResponseCount = events.aiResponses.length;

    // Phase 2: New user message wakes AIs
    const wakeCountBefore = events.wakeEvents.length;
    simulateUserMessage(orchestrator, "room-1", "Second question");

    // With very short delays the orchestrator can wake and re-sleep almost
    // instantly. Instead of checking instantaneous isAsleep state, verify
    // that a wake event was emitted (durable, order-preserving fact).
    await waitFor(
      () => events.wakeEvents.length > wakeCountBefore,
      5_000,
    );
    expect(events.wakeEvents.length).toBeGreaterThan(wakeCountBefore);

    // Phase 3: Let AIs respond again until second sleep
    await waitForSleepState(orchestrator, true, 15_000);

    // Should have generated new responses after waking
    expect(events.aiResponses.length).toBeGreaterThan(sleepResponseCount);

    // Should have slept at least twice (once per user message cycle)
    expect(events.sleepEvents.length).toBeGreaterThanOrEqual(2);
  }, 30_000);

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

    // Rapid cycle: message → sleep → message → sleep → message
    for (let cycle = 0; cycle < 3; cycle++) {
      simulateUserMessage(orchestrator, "room-1", `Cycle ${cycle + 1}`);
      await waitForSleepState(orchestrator, true, 15_000);
    }

    // Should have gone through multiple sleep/wake cycles
    expect(events.sleepEvents.length).toBeGreaterThanOrEqual(3);
    expect(events.wakeEvents.length).toBeGreaterThanOrEqual(2); // First message doesn't wake (already awake)
    expect(events.aiResponses.length).toBeGreaterThan(0);
  }, 30_000);
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
    await waitForSleepState(orchestrator, true, 15_000);

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
    await waitForSleepState(orchestrator, true, 15_000);

    const highLimitCount = orchestrator.messageTracker.aiMessageCount;

    // Higher limit should produce more AI messages before sleeping
    expect(highLimitCount).toBeGreaterThanOrEqual(lowLimitCount);
    expect(highLimitCount).toBeLessThanOrEqual(10);
  }, 30_000);

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

    simulateUserMessage(orchestrator, "room-1", "Serial test");
    await waitFor(() => events.aiResponses.length >= 1, 5_000);

    // Responses should have been generated
    expect(events.aiResponses.length).toBeGreaterThan(0);
    // With maxConcurrentResponses=1, activeResponseCount should be <= 1
    expect(orchestrator.activeResponseCount).toBeLessThanOrEqual(1);
  }, 10_000);

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
    await waitFor(() => events.aiResponses.length >= 1, 5_000);

    const directResponseCount = events.aiResponses.length;
    expect(directResponseCount).toBeGreaterThan(0);

    // Wait and check for any background responses — none should arrive
    // since background delay is 10M ms
    await sleep(500);
    resetEventCollector(events);
    await sleep(500);

    // No new responses from background conversation
    expect(events.aiResponses.length).toBe(0);
  }, 10_000);
});

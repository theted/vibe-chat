/**
 * Orchestrator Test Utilities
 *
 * Reusable helpers for testing ChatOrchestrator timing behavior with
 * mocked AI services. Uses real timers with very short delays (10-50ms)
 * since Bun 1.0.x does not support jest.useFakeTimers().
 *
 * Key concepts:
 * - MockAIService: Tracks call count and responds instantly (no real API calls)
 * - Event collectors: Capture orchestrator events for assertions
 * - waitFor(): Poll-based async helper for waiting on conditions
 * - Each test AI uses a unique providerKey+modelKey so the orchestrator
 *   generates distinct aiIds (format: `${providerKey}_${modelKey}`)
 *
 * Always call orchestrator.cleanup() in afterEach to cancel pending timers.
 */

import {
  AI_PROVIDERS,
  AIServiceFactory,
  BaseAIService,
  ChatOrchestrator,
  type AIServiceConfig,
  type Message,
} from "@ai-chat/core";
import type { ServiceConstructor } from "@ai-chat/core";

// ---------------------------------------------------------------------------
// Mock AI Service
// ---------------------------------------------------------------------------

export class MockAIService extends BaseAIService {
  responseCount = 0;
  responseTimes: number[] = [];
  private startTime = Date.now();

  constructor(config: AIServiceConfig) {
    super(config, "MockAIService");
  }

  protected async performInitialization(): Promise<void> {
    return;
  }

  protected async performGenerateResponse(
    messages: Message[],
  ): Promise<{ content: string }> {
    this.responseCount++;
    this.responseTimes.push(Date.now() - this.startTime);
    const lastMessage = messages[messages.length - 1];
    return { content: `Mock response #${this.responseCount}: ${lastMessage?.content ?? ""}` };
  }

  protected async performHealthCheck(): Promise<boolean> {
    return true;
  }

  resetCounters() {
    this.responseCount = 0;
    this.responseTimes = [];
    this.startTime = Date.now();
  }
}

// ---------------------------------------------------------------------------
// Build pool of unique provider+model combos for multi-AI tests
// ---------------------------------------------------------------------------

type AIConfigSlot = { providerKey: string; modelKey: string; providerName: string; envVar: string };

const allSlots: AIConfigSlot[] = [];
for (const [providerKey, providerConfig] of Object.entries(AI_PROVIDERS)) {
  for (const modelKey of Object.keys(providerConfig.models)) {
    allSlots.push({
      providerKey,
      modelKey,
      providerName: providerConfig.name,
      envVar: providerConfig.apiKeyEnvVar,
    });
  }
}

if (allSlots.length === 0) {
  throw new Error("No AI provider/model combinations available for tests.");
}

export { allSlots };

// ---------------------------------------------------------------------------
// Service Registry Helpers
// ---------------------------------------------------------------------------

/**
 * Override the service registry so ALL provider names resolve to MockAIService.
 * Also sets fake API keys for every provider's env var.
 * Returns a cleanup function to restore original state.
 */
export const installMockRegistry = (): (() => void) => {
  const previous = AIServiceFactory.__getServiceRegistryForTesting();

  // Build registry override: every provider name -> MockAIService
  const mockRegistry: Record<string, ServiceConstructor> = { ...previous };
  const envBackup = new Map<string, string | undefined>();

  for (const [, providerConfig] of Object.entries(AI_PROVIDERS)) {
    mockRegistry[providerConfig.name] = MockAIService;
    const envKey = providerConfig.apiKeyEnvVar;
    if (!envBackup.has(envKey)) {
      envBackup.set(envKey, process.env[envKey]);
      process.env[envKey] = "test-key";
    }
  }

  AIServiceFactory.__setServiceRegistryForTesting(mockRegistry);

  return () => {
    for (const [envKey, previousValue] of envBackup.entries()) {
      if (previousValue === undefined) {
        delete process.env[envKey];
      } else {
        process.env[envKey] = previousValue;
      }
    }
    if (previous) {
      AIServiceFactory.__setServiceRegistryForTesting(previous);
    }
  };
};

// ---------------------------------------------------------------------------
// Orchestrator Factory
// ---------------------------------------------------------------------------

export type TimingTestConfig = {
  aiCount?: number;
  maxAIMessages?: number;
  maxConcurrentResponses?: number;
  minUserResponseDelay?: number;
  maxUserResponseDelay?: number;
  minBackgroundDelay?: number;
  maxBackgroundDelay?: number;
  minDelayBetweenAI?: number;
  maxDelayBetweenAI?: number;
};

/**
 * Create an orchestrator with N mock AIs, each with a unique providerKey+modelKey.
 * Default delays are very short (10-50ms) to keep tests fast.
 */
export const createTestOrchestrator = async (
  config: TimingTestConfig = {},
) => {
  const {
    aiCount = 3,
    maxAIMessages = 10,
    maxConcurrentResponses = 2,
    minUserResponseDelay = 10,
    maxUserResponseDelay = 30,
    minBackgroundDelay = 50,
    maxBackgroundDelay = 80,
    minDelayBetweenAI = 5,
    maxDelayBetweenAI = 15,
  } = config;

  if (aiCount > allSlots.length) {
    throw new Error(
      `Requested ${aiCount} AIs but only ${allSlots.length} unique provider/model combos available.`,
    );
  }

  const orchestrator = new ChatOrchestrator({
    maxAIMessages,
    maxConcurrentResponses,
    minUserResponseDelay,
    maxUserResponseDelay,
    minBackgroundDelay,
    maxBackgroundDelay,
    minDelayBetweenAI,
    maxDelayBetweenAI,
  });

  const aiConfigs = allSlots.slice(0, aiCount).map((slot, i) => ({
    providerKey: slot.providerKey,
    modelKey: slot.modelKey,
    displayName: `MockAI-${i}`,
    alias: `MockAI-${i}`,
  }));

  await orchestrator.initializeAIs(aiConfigs);

  // The constructor calls startBackgroundConversation() before AIs are
  // initialized, causing it to schedule a 30s retry (SLEEP_RETRY_INTERVAL).
  // Restart it now so the background timer uses the actual configured delays.
  if (orchestrator.backgroundConversationTimer) {
    clearTimeout(orchestrator.backgroundConversationTimer);
    orchestrator.backgroundConversationTimer = null;
  }
  orchestrator.startBackgroundConversation();

  return { orchestrator, aiConfigs };
};

// ---------------------------------------------------------------------------
// Event Collector
// ---------------------------------------------------------------------------

export type CollectedEvents = {
  aiResponses: Array<Record<string, unknown>>;
  sleepEvents: Array<Record<string, unknown>>;
  wakeEvents: Array<Record<string, unknown>>;
  generatingStart: Array<Record<string, unknown>>;
  generatingStop: Array<Record<string, unknown>>;
  errors: Array<Record<string, unknown>>;
};

export const createEventCollector = (orchestrator: ChatOrchestrator): CollectedEvents => {
  const events: CollectedEvents = {
    aiResponses: [],
    sleepEvents: [],
    wakeEvents: [],
    generatingStart: [],
    generatingStop: [],
    errors: [],
  };

  orchestrator.on("ai-response", (data) => events.aiResponses.push(data));
  orchestrator.on("ais-sleeping", (data) => events.sleepEvents.push(data));
  orchestrator.on("ais-awakened", () => events.wakeEvents.push({ time: Date.now() }));
  orchestrator.on("ai-generating-start", (data) => events.generatingStart.push(data));
  orchestrator.on("ai-generating-stop", (data) => events.generatingStop.push(data));
  orchestrator.on("ai-error", (data) => events.errors.push(data));

  return events;
};

export const resetEventCollector = (events: CollectedEvents) => {
  events.aiResponses.length = 0;
  events.sleepEvents.length = 0;
  events.wakeEvents.length = 0;
  events.generatingStart.length = 0;
  events.generatingStop.length = 0;
  events.errors.length = 0;
};

// ---------------------------------------------------------------------------
// Async Wait Helpers
// ---------------------------------------------------------------------------

/** Sleep for `ms` milliseconds using real timers. */
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wait until a condition becomes true, polling every `intervalMs`.
 * Throws if the condition is not met within `timeoutMs`.
 */
export const waitFor = async (
  condition: () => boolean,
  timeoutMs = 5_000,
  intervalMs = 20,
): Promise<void> => {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`waitFor timed out after ${timeoutMs}ms`);
    }
    await sleep(intervalMs);
  }
};

/**
 * Wait until the orchestrator enters the expected sleep state.
 */
export const waitForSleepState = async (
  orchestrator: ChatOrchestrator,
  expected: boolean,
  timeoutMs = 10_000,
): Promise<void> => {
  await waitFor(
    () => orchestrator.messageTracker.isAsleep === expected,
    timeoutMs,
  );
};

// ---------------------------------------------------------------------------
// Message Simulation
// ---------------------------------------------------------------------------

export const simulateUserMessage = (
  orchestrator: ChatOrchestrator,
  roomId: string,
  content: string,
  sender = "TestUser",
) => {
  orchestrator.addMessage({
    sender,
    content,
    senderType: "user",
    roomId,
    role: "user",
  });
};

// ---------------------------------------------------------------------------
// Assertion Helpers
// ---------------------------------------------------------------------------

/** Assert that the orchestrator's sleep state matches expected value. */
export const assertSleepState = (
  orchestrator: ChatOrchestrator,
  expected: boolean,
) => {
  if (orchestrator.messageTracker.isAsleep !== expected) {
    throw new Error(
      `Expected isAsleep=${expected}, got ${orchestrator.messageTracker.isAsleep}`,
    );
  }
};

import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  AI_PROVIDERS,
  AIServiceFactory,
  BaseAIService,
  ChatOrchestrator,
  type Message,
} from "@ai-chat/core";
import type { ServiceConstructor } from "@ai-chat/core";

class SlowMockService extends BaseAIService {
  protected async performInitialization(): Promise<void> {
    activeInitializations += 1;
    maxConcurrentInitializations = Math.max(
      maxConcurrentInitializations,
      activeInitializations,
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    activeInitializations -= 1;
  }

  protected async performGenerateResponse(messages: Message[]): Promise<{
    content: string;
  }> {
    const lastMessage = messages[messages.length - 1];
    return {
      content: `Mocked:${lastMessage?.content ?? ""}`,
    };
  }

  protected async performHealthCheck(): Promise<boolean> {
    return true;
  }
}

const envState = new Map<string, string | undefined>();
let previousRegistry: Record<string, ServiceConstructor> | null = null;
let activeInitializations = 0;
let maxConcurrentInitializations = 0;

const buildConfigs = (maxConfigs: number) => {
  const configs: Array<{
    providerKey: string;
    modelKey: string;
  }> = [];

  for (const [providerKey, provider] of Object.entries(AI_PROVIDERS)) {
    for (const modelKey of Object.keys(provider.models)) {
      configs.push({ providerKey, modelKey });
      if (configs.length >= maxConfigs) {
        return configs;
      }
    }
  }

  return configs;
};

beforeEach(() => {
  activeInitializations = 0;
  maxConcurrentInitializations = 0;

  for (const provider of Object.values(AI_PROVIDERS)) {
    envState.set(
      provider.apiKeyEnvVar,
      process.env[provider.apiKeyEnvVar],
    );
    process.env[provider.apiKeyEnvVar] = "test-key";
  }

  envState.set("AI_CHAT_SKIP_HEALTHCHECK", process.env.AI_CHAT_SKIP_HEALTHCHECK);
  process.env.AI_CHAT_SKIP_HEALTHCHECK = "true";

  previousRegistry = AIServiceFactory.__getServiceRegistryForTesting();
  const registry: Record<string, ServiceConstructor> = {};
  for (const provider of Object.values(AI_PROVIDERS)) {
    registry[provider.name] = SlowMockService;
  }
  AIServiceFactory.__setServiceRegistryForTesting(registry);
});

afterEach(() => {
  for (const [key, value] of envState.entries()) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  envState.clear();
  if (previousRegistry) {
    AIServiceFactory.__setServiceRegistryForTesting(previousRegistry);
    previousRegistry = null;
  }
});

describe("ChatOrchestrator initialization", () => {
  it("limits parallel AI initialization to the concurrency cap", async () => {
    const configs = buildConfigs(10);
    assert.ok(
      configs.length >= 2,
      "Expected at least two AI configs for concurrency test.",
    );

    const orchestrator = new ChatOrchestrator({
      minBackgroundDelay: 1_000_000,
      maxBackgroundDelay: 1_000_000,
    });

    await orchestrator.initializeAIs(configs);

    assert.equal(orchestrator.aiServices.size, configs.length);
    assert.ok(maxConcurrentInitializations <= 8);
    assert.ok(
      maxConcurrentInitializations >= Math.min(2, configs.length),
      "Expected at least two concurrent initializations.",
    );

    orchestrator.cleanup();
  });
});

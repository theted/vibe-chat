import { afterEach, beforeEach, describe, it, expect } from "bun:test";
import {
  AI_PROVIDERS,
  AIServiceFactory,
  BaseAIService,
  ChatOrchestrator,
  type AIServiceConfig,
  type Message,
} from "@ai-chat/core";
import type { ServiceConstructor } from "@ai-chat/core";

class MockAIService extends BaseAIService {
  constructor(config: AIServiceConfig) {
    super(config, "MockAIService");
  }

  protected async performInitialization(): Promise<void> {
    return;
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

const [providerKey, providerConfig] = Object.entries(AI_PROVIDERS)[0] ?? [];
if (!providerConfig) {
  throw new Error("No AI providers available for mocked integration test.");
}

const [modelKey] = Object.keys(providerConfig.models);
if (!modelKey) {
  throw new Error(
    `No models available for provider ${providerConfig.name} in mocked integration test.`,
  );
}

const envState = new Map<string, string | undefined>();
let previousRegistry: Record<string, ServiceConstructor> | null = null;

beforeEach(() => {
  envState.set(
    providerConfig.apiKeyEnvVar,
    process.env[providerConfig.apiKeyEnvVar],
  );
  process.env[providerConfig.apiKeyEnvVar] = "test-key";
  previousRegistry = AIServiceFactory.__getServiceRegistryForTesting();
  AIServiceFactory.__setServiceRegistryForTesting({
    ...previousRegistry,
    [providerConfig.name]: MockAIService,
  });
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

describe("ai-chat-core integration with mocked providers", () => {
  it("creates a mocked service and generates a response", async () => {
    const service = AIServiceFactory.createServiceByName(providerKey, modelKey);
    await service.initialize();

    const response = await service.generateResponse([
      { role: "user", content: "Ping" },
    ]);

    expect(response.content).toBe("Mocked:Ping");
    expect(response.model).toBe(providerConfig.models[modelKey].id);
  });

  it("initializes ChatOrchestrator services with mocked provider", async () => {
    const orchestrator = new ChatOrchestrator({
      minBackgroundDelay: 1_000_000,
      maxBackgroundDelay: 1_000_000,
    });

    await orchestrator.initializeAIs([
      {
        providerKey,
        modelKey,
        displayName: "Mocky",
        alias: "Mocky",
      },
    ]);

    expect(orchestrator.aiServices.size).toBe(1);
    expect(orchestrator.activeAIs.length).toBe(1);

    const [serviceEntry] = Array.from(orchestrator.aiServices.values());
    expect(serviceEntry.displayName).toBe("Mocky");
    expect(serviceEntry.service.getName()).toBe("MockAIService");

    orchestrator.cleanup();
  });
});

import { afterEach, beforeEach, describe, it, expect } from "bun:test";
import {
  AIServiceFactory,
  type AIServiceConfig,
  type IAIService,
} from "@ai-chat/core";

type KimiConfig = AIServiceConfig & { baseURL?: string };

// Kimi resolves through the registry to a data-driven
// OpenAI-compatible service class (see serviceClassFactory.ts)
const baseConfig: AIServiceConfig = {
  provider: {
    name: "Kimi",
    apiKeyEnvVar: "KIMI_API_KEY",
  },
  model: {
    id: "moonshot-v1-8k",
  },
};

const envKey = "KIMI_API_KEY";
const envState = new Map<string, string | undefined>();

const getClientBaseUrl = (service: IAIService): string | undefined => {
  const client = (service as unknown as { client?: { baseURL?: string } })
    .client;
  return client?.baseURL;
};

beforeEach(() => {
  envState.set(envKey, process.env[envKey]);
  process.env[envKey] = "test-key";
});

afterEach(() => {
  const original = envState.get(envKey);
  if (original === undefined) {
    delete process.env[envKey];
  } else {
    process.env[envKey] = original;
  }
  envState.clear();
});

describe("openAICompatibleServiceClass baseURL precedence", () => {
  it("uses configured baseURL when provided", async () => {
    const config: KimiConfig = {
      ...baseConfig,
      baseURL: "https://custom.moonshot.example/v1",
    };

    const service = AIServiceFactory.createService(config);
    await service.initialize({ validateOnInit: false });

    expect(getClientBaseUrl(service)).toBe(config.baseURL);
  });

  it("prefers initialization baseURL override over config", async () => {
    const config: KimiConfig = {
      ...baseConfig,
      baseURL: "https://custom.moonshot.example/v1",
    };
    const overrideBaseUrl = "https://override.moonshot.example/v1";

    const service = AIServiceFactory.createService(config);
    await service.initialize({
      validateOnInit: false,
      baseURL: overrideBaseUrl,
    });

    expect(getClientBaseUrl(service)).toBe(overrideBaseUrl);
  });
});

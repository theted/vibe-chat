import { afterEach, beforeEach, describe, it, expect } from "bun:test";
import {
  AIServiceFactory,
  type AIServiceConfig,
  type IAIService,
} from "@ai-chat/core";

type GrokConfig = AIServiceConfig & { baseURL?: string };

// Grok resolves through the registry to a data-driven
// OpenAI-compatible service class (see serviceClassFactory.ts)
const baseConfig: AIServiceConfig = {
  provider: {
    name: "Grok",
    apiKeyEnvVar: "GROK_API_KEY",
  },
  model: {
    id: "grok-4.7",
  },
};

const envKey = "GROK_API_KEY";
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
    const config: GrokConfig = {
      ...baseConfig,
      baseURL: "https://custom.grok.example/v1",
    };

    const service = AIServiceFactory.createService(config);
    await service.initialize({ validateOnInit: false });

    expect(getClientBaseUrl(service)).toBe(config.baseURL);
  });

  it("prefers initialization baseURL override over config", async () => {
    const config: GrokConfig = {
      ...baseConfig,
      baseURL: "https://custom.grok.example/v1",
    };
    const overrideBaseUrl = "https://override.grok.example/v1";

    const service = AIServiceFactory.createService(config);
    await service.initialize({
      validateOnInit: false,
      baseURL: overrideBaseUrl,
    });

    expect(getClientBaseUrl(service)).toBe(overrideBaseUrl);
  });
});

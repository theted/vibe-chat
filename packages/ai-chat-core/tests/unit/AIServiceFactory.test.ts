import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { AIServiceFactory, type AIServiceConfig, type IAIService } from "@ai-chat/core";

// Mock service class for testing
class MockAIService implements IAIService {
  config: AIServiceConfig;
  name: string;

  constructor(config: AIServiceConfig) {
    this.config = config;
    this.name = "MockAIService";
  }

  async initialize() {}
  async generateResponse() {
    return { content: "mock response" };
  }
  isConfigured() {
    return true;
  }
  getName() {
    return this.name;
  }
  getModel() {
    return this.config.model.id;
  }
  getEnhancedSystemPrompt(additionalContext?: string) {
    return this.config.model.systemPrompt || "";
  }
  async validateConfiguration() {
    return true;
  }
}

// Store original registry
let originalRegistry: Record<string, new (config: AIServiceConfig) => IAIService>;

beforeEach(() => {
  originalRegistry = AIServiceFactory.__getServiceRegistryForTesting();
});

afterEach(() => {
  AIServiceFactory.__setServiceRegistryForTesting(originalRegistry);
});

describe("AIServiceFactory", () => {
  describe("getAvailableProviders", () => {
    it("returns list of registered provider names", () => {
      const providers = AIServiceFactory.getAvailableProviders();

      assert.ok(Array.isArray(providers));
      assert.ok(providers.length > 0);
      assert.ok(providers.includes("Gemini"));
      assert.ok(providers.includes("OpenAI"));
      assert.ok(providers.includes("Anthropic"));
    });
  });

  describe("isProviderSupported", () => {
    it("returns true for registered providers", () => {
      assert.equal(AIServiceFactory.isProviderSupported("Gemini"), true);
      assert.equal(AIServiceFactory.isProviderSupported("OpenAI"), true);
      assert.equal(AIServiceFactory.isProviderSupported("Anthropic"), true);
      assert.equal(AIServiceFactory.isProviderSupported("Mistral"), true);
      assert.equal(AIServiceFactory.isProviderSupported("DeepSeek"), true);
      assert.equal(AIServiceFactory.isProviderSupported("Grok"), true);
      assert.equal(AIServiceFactory.isProviderSupported("Qwen"), true);
      assert.equal(AIServiceFactory.isProviderSupported("Kimi"), true);
      assert.equal(AIServiceFactory.isProviderSupported("Z.ai"), true);
      assert.equal(AIServiceFactory.isProviderSupported("Cohere"), true);
      assert.equal(AIServiceFactory.isProviderSupported("Llama"), true);
      assert.equal(AIServiceFactory.isProviderSupported("Perplexity"), true);
    });

    it("returns false for unknown providers", () => {
      assert.equal(AIServiceFactory.isProviderSupported("UnknownAI"), false);
      assert.equal(AIServiceFactory.isProviderSupported(""), false);
      assert.equal(AIServiceFactory.isProviderSupported("openai"), false); // case sensitive
    });
  });

  describe("createService", () => {
    it("creates service for registered provider", () => {
      // Use mock registry to avoid needing real API keys
      AIServiceFactory.__setServiceRegistryForTesting({
        MockProvider: MockAIService,
      });

      const config: AIServiceConfig = {
        provider: {
          name: "MockProvider",
          apiKeyEnvVar: "MOCK_API_KEY",
        },
        model: {
          id: "mock-model-v1",
        },
      };

      const service = AIServiceFactory.createService(config);

      assert.ok(service);
      assert.equal(service.getName(), "MockAIService");
      assert.equal(service.getModel(), "mock-model-v1");
    });

    it("throws error for unsupported provider", () => {
      const config: AIServiceConfig = {
        provider: {
          name: "UnsupportedProvider",
          apiKeyEnvVar: "UNSUPPORTED_API_KEY",
        },
        model: {
          id: "unsupported-model",
        },
      };

      assert.throws(
        () => AIServiceFactory.createService(config),
        (error: Error) => {
          assert.ok(error.message.includes("Unsupported AI provider"));
          assert.ok(error.message.includes("UnsupportedProvider"));
          return true;
        }
      );
    });

    it("includes supported providers in error message", () => {
      AIServiceFactory.__setServiceRegistryForTesting({
        Provider1: MockAIService,
        Provider2: MockAIService,
      });

      const config: AIServiceConfig = {
        provider: {
          name: "BadProvider",
          apiKeyEnvVar: "BAD_API_KEY",
        },
        model: {
          id: "bad-model",
        },
      };

      try {
        AIServiceFactory.createService(config);
        assert.fail("Expected error to be thrown");
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.ok(error.message.includes("Provider1"));
        assert.ok(error.message.includes("Provider2"));
      }
    });

    it("passes config to service constructor", () => {
      let receivedConfig: AIServiceConfig | null = null;

      class ConfigCapturingService extends MockAIService {
        constructor(config: AIServiceConfig) {
          super(config);
          receivedConfig = config;
        }
      }

      AIServiceFactory.__setServiceRegistryForTesting({
        ConfigCapture: ConfigCapturingService,
      });

      const config: AIServiceConfig = {
        provider: {
          name: "ConfigCapture",
          apiKeyEnvVar: "TEST_API_KEY",
        },
        model: {
          id: "test-model",
          systemPrompt: "You are a test assistant",
        },
      };

      AIServiceFactory.createService(config);

      assert.ok(receivedConfig);
      assert.equal(receivedConfig!.provider.name, "ConfigCapture");
      assert.equal(receivedConfig!.model.id, "test-model");
      assert.equal(receivedConfig!.model.systemPrompt, "You are a test assistant");
    });
  });

  describe("createServiceByName", () => {
    it("throws error for unknown provider key", () => {
      assert.throws(
        () => AIServiceFactory.createServiceByName("UNKNOWN", "MODEL"),
        (error: Error) => {
          assert.ok(error.message.includes("Provider not found"));
          assert.ok(error.message.includes("UNKNOWN"));
          return true;
        }
      );
    });

    it("throws error for unknown model key", () => {
      assert.throws(
        () => AIServiceFactory.createServiceByName("OPENAI", "UNKNOWN_MODEL"),
        (error: Error) => {
          assert.ok(error.message.includes("Model not found"));
          assert.ok(error.message.includes("UNKNOWN_MODEL"));
          return true;
        }
      );
    });
  });

  describe("__setServiceRegistryForTesting", () => {
    it("replaces registry and returns previous one", () => {
      const newRegistry = { TestProvider: MockAIService };

      const previous = AIServiceFactory.__setServiceRegistryForTesting(newRegistry);

      assert.ok(previous);
      assert.ok(Object.keys(previous).length > 0);

      const current = AIServiceFactory.__getServiceRegistryForTesting();
      assert.deepEqual(current, newRegistry);
    });

    it("allows testing with custom providers", () => {
      class CustomTestService extends MockAIService {
        name = "CustomTestService";
      }

      AIServiceFactory.__setServiceRegistryForTesting({
        CustomTest: CustomTestService,
      });

      const config: AIServiceConfig = {
        provider: {
          name: "CustomTest",
          apiKeyEnvVar: "CUSTOM_API_KEY",
        },
        model: {
          id: "custom-model",
        },
      };

      const service = AIServiceFactory.createService(config);
      assert.equal(service.getName(), "CustomTestService");
    });
  });

  describe("__getServiceRegistryForTesting", () => {
    it("returns copy of registry (not original)", () => {
      const registry1 = AIServiceFactory.__getServiceRegistryForTesting();
      const registry2 = AIServiceFactory.__getServiceRegistryForTesting();

      assert.notEqual(registry1, registry2);
      assert.deepEqual(registry1, registry2);
    });
  });
});

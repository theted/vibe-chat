import { afterEach, beforeEach, describe, it, expect } from "bun:test";
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

      expect(Array.isArray(providers)).toBeTruthy();
      expect(providers.length > 0).toBeTruthy();
      expect(providers.includes("Gemini")).toBeTruthy();
      expect(providers.includes("OpenAI")).toBeTruthy();
      expect(providers.includes("Anthropic")).toBeTruthy();
    });
  });

  describe("isProviderSupported", () => {
    it("returns true for registered providers", () => {
      expect(AIServiceFactory.isProviderSupported("Gemini")).toBe(true);
      expect(AIServiceFactory.isProviderSupported("OpenAI")).toBe(true);
      expect(AIServiceFactory.isProviderSupported("Anthropic")).toBe(true);
      expect(AIServiceFactory.isProviderSupported("Mistral")).toBe(true);
      expect(AIServiceFactory.isProviderSupported("DeepSeek")).toBe(true);
      expect(AIServiceFactory.isProviderSupported("Grok")).toBe(true);
      expect(AIServiceFactory.isProviderSupported("Qwen")).toBe(true);
      expect(AIServiceFactory.isProviderSupported("Kimi")).toBe(true);
      expect(AIServiceFactory.isProviderSupported("Z.ai")).toBe(true);
      expect(AIServiceFactory.isProviderSupported("Cohere")).toBe(true);
      expect(AIServiceFactory.isProviderSupported("Meta")).toBe(true);
      expect(AIServiceFactory.isProviderSupported("NVIDIA")).toBe(true);
      expect(AIServiceFactory.isProviderSupported("Xiaomi")).toBe(true);
      expect(AIServiceFactory.isProviderSupported("MiniMax")).toBe(true);
      expect(AIServiceFactory.isProviderSupported("Baidu")).toBe(true);
      expect(AIServiceFactory.isProviderSupported("ByteDance")).toBe(true);
      expect(AIServiceFactory.isProviderSupported("Hugging Face")).toBe(true);
      expect(AIServiceFactory.isProviderSupported("Perplexity")).toBe(true);
    });

    it("returns false for unknown providers", () => {
      expect(AIServiceFactory.isProviderSupported("UnknownAI")).toBe(false);
      expect(AIServiceFactory.isProviderSupported("")).toBe(false);
      expect(AIServiceFactory.isProviderSupported("openai")).toBe(false); // case sensitive
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

      expect(service).toBeTruthy();
      expect(service.getName()).toBe("MockAIService");
      expect(service.getModel()).toBe("mock-model-v1");
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

      try {
        AIServiceFactory.createService(config);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("Unsupported AI provider");
        expect((error as Error).message).toContain("UnsupportedProvider");
      }
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
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("Provider1");
        expect((error as Error).message).toContain("Provider2");
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

      expect(receivedConfig).toBeTruthy();
      expect(receivedConfig!.provider.name).toBe("ConfigCapture");
      expect(receivedConfig!.model.id).toBe("test-model");
      expect(receivedConfig!.model.systemPrompt).toBe("You are a test assistant");
    });
  });

  describe("createServiceByName", () => {
    it("throws error for unknown provider key", () => {
      try {
        AIServiceFactory.createServiceByName("UNKNOWN", "MODEL");
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("Provider not found");
        expect((error as Error).message).toContain("UNKNOWN");
      }
    });

    it("throws error for unknown model key", () => {
      try {
        AIServiceFactory.createServiceByName("OPENAI", "UNKNOWN_MODEL");
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("Model not found");
        expect((error as Error).message).toContain("UNKNOWN_MODEL");
      }
    });
  });

  describe("__setServiceRegistryForTesting", () => {
    it("replaces registry and returns previous one", () => {
      const newRegistry = { TestProvider: MockAIService };

      const previous = AIServiceFactory.__setServiceRegistryForTesting(newRegistry);

      expect(previous).toBeTruthy();
      expect(Object.keys(previous).length > 0).toBeTruthy();

      const current = AIServiceFactory.__getServiceRegistryForTesting();
      expect(current).toEqual(newRegistry);
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
      expect(service.getName()).toBe("CustomTestService");
    });
  });

  describe("__getServiceRegistryForTesting", () => {
    it("returns copy of registry (not original)", () => {
      const registry1 = AIServiceFactory.__getServiceRegistryForTesting();
      const registry2 = AIServiceFactory.__getServiceRegistryForTesting();

      expect(registry1).not.toBe(registry2);
      expect(registry1).toEqual(registry2);
    });
  });
});

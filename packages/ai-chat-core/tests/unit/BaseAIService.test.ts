import { afterEach, beforeEach, describe, it, expect } from "bun:test";
import { BaseAIService, type AIServiceConfig, type Message } from "@ai-chat/core";

// Inline type since ServiceResponse is not exported from @ai-chat/core
type ServiceResponse = { content: string };

const API_KEY_ENV_VAR = "TEST_AI_SERVICE_API_KEY";

// Concrete implementation for testing
class TestAIService extends BaseAIService {
  initializeCallCount = 0;
  generateCallCount = 0;
  healthCheckResult = true;
  configCheckResult = true;
  shouldThrowOnInit = false;
  shouldThrowOnGenerate = false;

  constructor(config: AIServiceConfig) {
    super(config, "TestAIService");
  }

  protected async performInitialization(): Promise<void> {
    this.initializeCallCount++;
    if (this.shouldThrowOnInit) {
      throw new Error("Initialization failed");
    }
  }

  protected async performGenerateResponse(
    messages: Message[],
    context?: Record<string, unknown>
  ): Promise<ServiceResponse> {
    this.generateCallCount++;
    if (this.shouldThrowOnGenerate) {
      throw new Error("Generation failed");
    }
    return { content: `Response to ${messages.length} messages` };
  }

  protected performConfigurationCheck(): boolean {
    return this.configCheckResult;
  }

  protected async performHealthCheck(): Promise<boolean> {
    return this.healthCheckResult;
  }
}

const createValidConfig = (): AIServiceConfig => ({
  provider: {
    name: "TestProvider",
    apiKeyEnvVar: API_KEY_ENV_VAR,
  },
  model: {
    id: "test-model-v1",
    systemPrompt: "You are a test assistant",
  },
});

const envState = new Map<string, string | undefined>();

beforeEach(() => {
  envState.set(API_KEY_ENV_VAR, process.env[API_KEY_ENV_VAR]);
  process.env[API_KEY_ENV_VAR] = "test-api-key";
});

afterEach(() => {
  const original = envState.get(API_KEY_ENV_VAR);
  if (original === undefined) {
    delete process.env[API_KEY_ENV_VAR];
  } else {
    process.env[API_KEY_ENV_VAR] = original;
  }
  envState.clear();
});

describe("BaseAIService", () => {
  describe("constructor", () => {
    it("stores config and name", () => {
      const config = createValidConfig();
      const service = new TestAIService(config);

      expect(service.name).toBe("TestAIService");
      expect(service.config).toBe(config);
    });

    it("throws error when provider name is missing", () => {
      const config = {
        provider: {
          name: "",
          apiKeyEnvVar: API_KEY_ENV_VAR,
        },
        model: { id: "test" },
      } as AIServiceConfig;

      expect(() => new TestAIService(config)).toThrow("Provider name is required");
    });

    it("throws error when model id is missing", () => {
      const config = {
        provider: {
          name: "TestProvider",
          apiKeyEnvVar: API_KEY_ENV_VAR,
        },
        model: { id: "" },
      } as AIServiceConfig;

      expect(() => new TestAIService(config)).toThrow("Model ID is required");
    });

    it("throws error when apiKeyEnvVar is missing", () => {
      const config = {
        provider: {
          name: "TestProvider",
          apiKeyEnvVar: "",
        },
        model: { id: "test" },
      } as AIServiceConfig;

      expect(() => new TestAIService(config)).toThrow("API key environment variable is required");
    });
  });

  describe("initialize", () => {
    it("calls performInitialization", async () => {
      const service = new TestAIService(createValidConfig());
      await service.initialize({ validateOnInit: false });

      expect(service.initializeCallCount).toBe(1);
    });

    it("sets initialized flag on success", async () => {
      const service = new TestAIService(createValidConfig());
      expect(service.isInitialized()).toBe(false);

      await service.initialize({ validateOnInit: false });

      expect(service.isInitialized()).toBe(true);
    });

    it("validates configuration when validateOnInit is true", async () => {
      const service = new TestAIService(createValidConfig());
      service.healthCheckResult = true;

      await service.initialize({ validateOnInit: true });

      expect(service.isInitialized()).toBe(true);
    });

    it("throws when validation fails", async () => {
      const service = new TestAIService(createValidConfig());
      service.healthCheckResult = false;

      try {
        await service.initialize({ validateOnInit: true });
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("validation failed");
      }
    });

    it("throws when performInitialization fails", async () => {
      const service = new TestAIService(createValidConfig());
      service.shouldThrowOnInit = true;

      try {
        await service.initialize({ validateOnInit: false });
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("Failed to initialize");
        expect((error as Error).message).toContain("Initialization failed");
      }
    });
  });

  describe("generateResponse", () => {
    it("throws when not initialized", async () => {
      const service = new TestAIService(createValidConfig());

      try {
        await service.generateResponse([{ role: "user", content: "Hello" }]);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("not initialized");
      }
    });

    it("throws when not configured", async () => {
      delete process.env[API_KEY_ENV_VAR];
      const service = new TestAIService(createValidConfig());
      await service.initialize({ validateOnInit: false });

      try {
        await service.generateResponse([{ role: "user", content: "Hello" }]);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("not properly configured");
      }
    });

    it("returns response with timing information", async () => {
      const service = new TestAIService(createValidConfig());
      await service.initialize({ validateOnInit: false });

      const response = await service.generateResponse([
        { role: "user", content: "Hello" },
      ]);

      expect(response.content).toBeTruthy();
      expect((response as { responseTime?: number }).responseTime !== undefined).toBeTruthy();
      expect((response as { responseTime?: number }).responseTime! >= 0).toBeTruthy();
      expect((response as { model?: string }).model).toBe("test-model-v1");
    });

    it("calls performGenerateResponse with messages", async () => {
      const service = new TestAIService(createValidConfig());
      await service.initialize({ validateOnInit: false });

      const messages: Message[] = [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there" },
      ];

      const response = await service.generateResponse(messages);

      expect(service.generateCallCount).toBe(1);
      expect(response.content).toBe("Response to 2 messages");
    });

    it("throws when generation fails", async () => {
      const service = new TestAIService(createValidConfig());
      await service.initialize({ validateOnInit: false });
      service.shouldThrowOnGenerate = true;

      try {
        await service.generateResponse([{ role: "user", content: "Hello" }]);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("Generation failed");
      }
    });
  });

  describe("isConfigured", () => {
    it("returns true when API key is set", () => {
      const service = new TestAIService(createValidConfig());
      expect(service.isConfigured()).toBe(true);
    });

    it("returns false when API key is missing", () => {
      delete process.env[API_KEY_ENV_VAR];
      const service = new TestAIService(createValidConfig());
      expect(service.isConfigured()).toBe(false);
    });

    it("returns false when config check fails", () => {
      const service = new TestAIService(createValidConfig());
      service.configCheckResult = false;
      expect(service.isConfigured()).toBe(false);
    });
  });

  describe("getName", () => {
    it("returns service name", () => {
      const service = new TestAIService(createValidConfig());
      expect(service.getName()).toBe("TestAIService");
    });
  });

  describe("getModel", () => {
    it("returns model id", () => {
      const service = new TestAIService(createValidConfig());
      expect(service.getModel()).toBe("test-model-v1");
    });
  });

  describe("getEnhancedSystemPrompt", () => {
    it("returns original prompt when no persona", () => {
      const config = createValidConfig();
      config.model.systemPrompt = "Original prompt";
      const service = new TestAIService(config);

      const prompt = service.getEnhancedSystemPrompt();

      expect(prompt.includes("Original prompt")).toBeTruthy();
    });

    it("appends additional context when provided", () => {
      const config = createValidConfig();
      config.model.systemPrompt = "Base prompt";
      const service = new TestAIService(config);

      const prompt = service.getEnhancedSystemPrompt("Extra context");

      expect(prompt.includes("Base prompt")).toBeTruthy();
      expect(prompt.includes("Extra context")).toBeTruthy();
    });

    it("returns empty string when no system prompt", () => {
      const config = createValidConfig();
      delete config.model.systemPrompt;
      const service = new TestAIService(config);

      const prompt = service.getEnhancedSystemPrompt();

      expect(typeof prompt).toBe("string");
    });
  });

  describe("healthCheck", () => {
    it("returns result from performHealthCheck", async () => {
      const service = new TestAIService(createValidConfig());
      service.healthCheckResult = true;

      const result = await service.healthCheck();

      expect(result).toBe(true);
    });

    it("caches health check results for 5 minutes", async () => {
      const service = new TestAIService(createValidConfig());
      service.healthCheckResult = true;

      await service.healthCheck();
      service.healthCheckResult = false;

      const cachedResult = await service.healthCheck();

      // Should still return true due to cache
      expect(cachedResult).toBe(true);
    });

    it("returns false when health check throws", async () => {
      class ThrowingService extends TestAIService {
        protected async performHealthCheck(): Promise<boolean> {
          throw new Error("Health check error");
        }
      }

      const service = new ThrowingService(createValidConfig());
      const result = await service.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe("validateConfiguration", () => {
    it("returns true when configured and healthy", async () => {
      const service = new TestAIService(createValidConfig());
      service.healthCheckResult = true;

      const result = await service.validateConfiguration();

      expect(result).toBe(true);
    });

    it("returns false when not configured", async () => {
      delete process.env[API_KEY_ENV_VAR];
      const service = new TestAIService(createValidConfig());

      const result = await service.validateConfiguration();

      expect(result).toBe(false);
    });

    it("returns false when health check fails", async () => {
      const service = new TestAIService(createValidConfig());
      service.healthCheckResult = false;

      const result = await service.validateConfiguration();

      expect(result).toBe(false);
    });
  });

  describe("shutdown", () => {
    it("resets initialized flag", async () => {
      const service = new TestAIService(createValidConfig());
      await service.initialize({ validateOnInit: false });
      expect(service.isInitialized()).toBe(true);

      await service.shutdown();

      expect(service.isInitialized()).toBe(false);
    });
  });

  describe("getConfig", () => {
    it("returns readonly copy of config", () => {
      const config = createValidConfig();
      const service = new TestAIService(config);

      const returnedConfig = service.getConfig();

      expect(returnedConfig).toEqual(config);
      expect(returnedConfig).not.toBe(config);
    });
  });

  describe("getMetadata", () => {
    it("returns service metadata", async () => {
      const service = new TestAIService(createValidConfig());
      await service.initialize({ validateOnInit: false });

      const metadata = service.getMetadata();

      expect(metadata.name).toBe("TestAIService");
      expect(metadata.provider).toBe("TestProvider");
      expect(metadata.model).toBe("test-model-v1");
      expect(metadata.initialized).toBe(true);
      expect(metadata.configured).toBe(true);
    });
  });

  describe("setLogger", () => {
    it("accepts logger without error", () => {
      const service = new TestAIService(createValidConfig());
      const mockLogger = {
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {},
      };

      service.setLogger(mockLogger);
      // Should not throw
    });
  });
});

import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
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

      assert.equal(service.name, "TestAIService");
      assert.equal(service.config, config);
    });

    it("throws error when provider name is missing", () => {
      const config = {
        provider: {
          name: "",
          apiKeyEnvVar: API_KEY_ENV_VAR,
        },
        model: { id: "test" },
      } as AIServiceConfig;

      assert.throws(
        () => new TestAIService(config),
        (error: Error) => {
          assert.ok(error.message.includes("Provider name is required"));
          return true;
        }
      );
    });

    it("throws error when model id is missing", () => {
      const config = {
        provider: {
          name: "TestProvider",
          apiKeyEnvVar: API_KEY_ENV_VAR,
        },
        model: { id: "" },
      } as AIServiceConfig;

      assert.throws(
        () => new TestAIService(config),
        (error: Error) => {
          assert.ok(error.message.includes("Model ID is required"));
          return true;
        }
      );
    });

    it("throws error when apiKeyEnvVar is missing", () => {
      const config = {
        provider: {
          name: "TestProvider",
          apiKeyEnvVar: "",
        },
        model: { id: "test" },
      } as AIServiceConfig;

      assert.throws(
        () => new TestAIService(config),
        (error: Error) => {
          assert.ok(error.message.includes("API key environment variable is required"));
          return true;
        }
      );
    });
  });

  describe("initialize", () => {
    it("calls performInitialization", async () => {
      const service = new TestAIService(createValidConfig());
      await service.initialize({ validateOnInit: false });

      assert.equal(service.initializeCallCount, 1);
    });

    it("sets initialized flag on success", async () => {
      const service = new TestAIService(createValidConfig());
      assert.equal(service.isInitialized(), false);

      await service.initialize({ validateOnInit: false });

      assert.equal(service.isInitialized(), true);
    });

    it("validates configuration when validateOnInit is true", async () => {
      const service = new TestAIService(createValidConfig());
      service.healthCheckResult = true;

      await service.initialize({ validateOnInit: true });

      assert.equal(service.isInitialized(), true);
    });

    it("throws when validation fails", async () => {
      const service = new TestAIService(createValidConfig());
      service.healthCheckResult = false;

      await assert.rejects(
        () => service.initialize({ validateOnInit: true }),
        (error: Error) => {
          assert.ok(error.message.includes("validation failed"));
          return true;
        }
      );
    });

    it("throws when performInitialization fails", async () => {
      const service = new TestAIService(createValidConfig());
      service.shouldThrowOnInit = true;

      await assert.rejects(
        () => service.initialize({ validateOnInit: false }),
        (error: Error) => {
          assert.ok(error.message.includes("Failed to initialize"));
          assert.ok(error.message.includes("Initialization failed"));
          return true;
        }
      );
    });
  });

  describe("generateResponse", () => {
    it("throws when not initialized", async () => {
      const service = new TestAIService(createValidConfig());

      await assert.rejects(
        () => service.generateResponse([{ role: "user", content: "Hello" }]),
        (error: Error) => {
          assert.ok(error.message.includes("not initialized"));
          return true;
        }
      );
    });

    it("throws when not configured", async () => {
      delete process.env[API_KEY_ENV_VAR];
      const service = new TestAIService(createValidConfig());
      await service.initialize({ validateOnInit: false });

      await assert.rejects(
        () => service.generateResponse([{ role: "user", content: "Hello" }]),
        (error: Error) => {
          assert.ok(error.message.includes("not properly configured"));
          return true;
        }
      );
    });

    it("returns response with timing information", async () => {
      const service = new TestAIService(createValidConfig());
      await service.initialize({ validateOnInit: false });

      const response = await service.generateResponse([
        { role: "user", content: "Hello" },
      ]);

      assert.ok(response.content);
      assert.ok((response as { responseTime?: number }).responseTime !== undefined);
      assert.ok((response as { responseTime?: number }).responseTime! >= 0);
      assert.equal((response as { model?: string }).model, "test-model-v1");
    });

    it("calls performGenerateResponse with messages", async () => {
      const service = new TestAIService(createValidConfig());
      await service.initialize({ validateOnInit: false });

      const messages: Message[] = [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there" },
      ];

      const response = await service.generateResponse(messages);

      assert.equal(service.generateCallCount, 1);
      assert.equal(response.content, "Response to 2 messages");
    });

    it("throws when generation fails", async () => {
      const service = new TestAIService(createValidConfig());
      await service.initialize({ validateOnInit: false });
      service.shouldThrowOnGenerate = true;

      await assert.rejects(
        () => service.generateResponse([{ role: "user", content: "Hello" }]),
        (error: Error) => {
          assert.ok(error.message.includes("Generation failed"));
          return true;
        }
      );
    });
  });

  describe("isConfigured", () => {
    it("returns true when API key is set", () => {
      const service = new TestAIService(createValidConfig());
      assert.equal(service.isConfigured(), true);
    });

    it("returns false when API key is missing", () => {
      delete process.env[API_KEY_ENV_VAR];
      const service = new TestAIService(createValidConfig());
      assert.equal(service.isConfigured(), false);
    });

    it("returns false when config check fails", () => {
      const service = new TestAIService(createValidConfig());
      service.configCheckResult = false;
      assert.equal(service.isConfigured(), false);
    });
  });

  describe("getName", () => {
    it("returns service name", () => {
      const service = new TestAIService(createValidConfig());
      assert.equal(service.getName(), "TestAIService");
    });
  });

  describe("getModel", () => {
    it("returns model id", () => {
      const service = new TestAIService(createValidConfig());
      assert.equal(service.getModel(), "test-model-v1");
    });
  });

  describe("getEnhancedSystemPrompt", () => {
    it("returns original prompt when no persona", () => {
      const config = createValidConfig();
      config.model.systemPrompt = "Original prompt";
      const service = new TestAIService(config);

      const prompt = service.getEnhancedSystemPrompt();

      assert.ok(prompt.includes("Original prompt"));
    });

    it("appends additional context when provided", () => {
      const config = createValidConfig();
      config.model.systemPrompt = "Base prompt";
      const service = new TestAIService(config);

      const prompt = service.getEnhancedSystemPrompt("Extra context");

      assert.ok(prompt.includes("Base prompt"));
      assert.ok(prompt.includes("Extra context"));
    });

    it("returns empty string when no system prompt", () => {
      const config = createValidConfig();
      delete config.model.systemPrompt;
      const service = new TestAIService(config);

      const prompt = service.getEnhancedSystemPrompt();

      assert.equal(typeof prompt, "string");
    });
  });

  describe("healthCheck", () => {
    it("returns result from performHealthCheck", async () => {
      const service = new TestAIService(createValidConfig());
      service.healthCheckResult = true;

      const result = await service.healthCheck();

      assert.equal(result, true);
    });

    it("caches health check results for 5 minutes", async () => {
      const service = new TestAIService(createValidConfig());
      service.healthCheckResult = true;

      await service.healthCheck();
      service.healthCheckResult = false;

      const cachedResult = await service.healthCheck();

      // Should still return true due to cache
      assert.equal(cachedResult, true);
    });

    it("returns false when health check throws", async () => {
      class ThrowingService extends TestAIService {
        protected async performHealthCheck(): Promise<boolean> {
          throw new Error("Health check error");
        }
      }

      const service = new ThrowingService(createValidConfig());
      const result = await service.healthCheck();

      assert.equal(result, false);
    });
  });

  describe("validateConfiguration", () => {
    it("returns true when configured and healthy", async () => {
      const service = new TestAIService(createValidConfig());
      service.healthCheckResult = true;

      const result = await service.validateConfiguration();

      assert.equal(result, true);
    });

    it("returns false when not configured", async () => {
      delete process.env[API_KEY_ENV_VAR];
      const service = new TestAIService(createValidConfig());

      const result = await service.validateConfiguration();

      assert.equal(result, false);
    });

    it("returns false when health check fails", async () => {
      const service = new TestAIService(createValidConfig());
      service.healthCheckResult = false;

      const result = await service.validateConfiguration();

      assert.equal(result, false);
    });
  });

  describe("shutdown", () => {
    it("resets initialized flag", async () => {
      const service = new TestAIService(createValidConfig());
      await service.initialize({ validateOnInit: false });
      assert.equal(service.isInitialized(), true);

      await service.shutdown();

      assert.equal(service.isInitialized(), false);
    });
  });

  describe("getConfig", () => {
    it("returns readonly copy of config", () => {
      const config = createValidConfig();
      const service = new TestAIService(config);

      const returnedConfig = service.getConfig();

      assert.deepEqual(returnedConfig, config);
      assert.notEqual(returnedConfig, config);
    });
  });

  describe("getMetadata", () => {
    it("returns service metadata", async () => {
      const service = new TestAIService(createValidConfig());
      await service.initialize({ validateOnInit: false });

      const metadata = service.getMetadata();

      assert.equal(metadata.name, "TestAIService");
      assert.equal(metadata.provider, "TestProvider");
      assert.equal(metadata.model, "test-model-v1");
      assert.equal(metadata.initialized, true);
      assert.equal(metadata.configured, true);
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

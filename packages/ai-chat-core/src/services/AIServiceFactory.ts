/**
 * AI Service Factory
 *
 * This factory creates AI service instances based on the provider configuration.
 */

import { OpenAIService } from "./OpenAIService.js";
import { AnthropicService } from "./AnthropicService.js";
import { DeepseekService } from "./DeepseekService.js";
import { MistralService } from "./MistralService.js";
import { GeminiService } from "./GeminiService.js";
import { GrokService } from "./GrokService.js";
import { QwenService } from "./QwenService.js";
import { KimiService } from "./KimiService.js";
import { ZaiService } from "./ZaiService.js";
import { CohereService } from "./CohereService.js";
import { LlamaService } from "./LlamaService.js";
import { PerplexityService } from "./PerplexityService.js";
import { AI_PROVIDERS } from "@/config/aiProviders/index.js";
import type { AIServiceConfig, IAIService } from "@/types/index.js";
import type {
  ServiceConstructor,
  ServiceConfigurationError,
} from "@/types/services.js";
import { BaseAIService } from "./base/BaseAIService.js";

export class AIServiceFactory {
  private static serviceRegistry: Record<string, ServiceConstructor> = {
    [AI_PROVIDERS.GEMINI.name]: GeminiService,
    [AI_PROVIDERS.MISTRAL.name]: MistralService,
    [AI_PROVIDERS.OPENAI.name]: OpenAIService,
    [AI_PROVIDERS.ANTHROPIC.name]: AnthropicService,
    [AI_PROVIDERS.DEEPSEEK.name]: DeepseekService,
    [AI_PROVIDERS.GROK.name]: GrokService,
    [AI_PROVIDERS.QWEN.name]: QwenService,
    [AI_PROVIDERS.KIMI.name]: KimiService,
    [AI_PROVIDERS.ZAI.name]: ZaiService,
    [AI_PROVIDERS.COHERE.name]: CohereService,
    [AI_PROVIDERS.LLAMA.name]: LlamaService,
    [AI_PROVIDERS.PERPLEXITY.name]: PerplexityService,
  };

  /**
   * Create an AI service instance based on the provider configuration
   * @param config - Provider and model configuration
   * @returns An instance of the appropriate AI service
   * @throws Error if the provider is not supported
   */
  static createService(config: AIServiceConfig): IAIService {
    const providerName = config.provider.name;
    const ServiceClass = this.serviceRegistry[providerName];

    if (!ServiceClass) {
      const supportedProviders = this.getAvailableProviders();
      throw new Error(
        `Unsupported AI provider: ${providerName}. Supported providers: ${supportedProviders.join(", ")}`,
      );
    }

    return new ServiceClass(config);
  }

  /**
   * Create an AI service instance for a specific provider and model
   * @param providerKey - Provider key (e.g., "OPENAI")
   * @param modelKey - Model key (e.g., "GPT4")
   * @returns An instance of the appropriate AI service
   * @throws Error if the provider or model is not found
   */
  static createServiceByName(
    providerKey: string,
    modelKey: string,
  ): IAIService {
    const provider = AI_PROVIDERS[providerKey as keyof typeof AI_PROVIDERS];
    if (!provider) {
      throw new Error(`Provider not found: ${providerKey}`);
    }

    const model = provider.models[modelKey];
    if (!model) {
      throw new Error(
        `Model not found: ${modelKey} for provider ${providerKey}`,
      );
    }

    return this.createService({ provider, model });
  }

  /**
   * Get list of available providers
   * @returns Array of available provider names
   */
  static getAvailableProviders(): string[] {
    return Object.keys(this.serviceRegistry);
  }

  /**
   * Check if a provider is supported
   * @param providerName - Name of the provider to check
   * @returns True if the provider is supported
   */
  static isProviderSupported(providerName: string): boolean {
    return providerName in this.serviceRegistry;
  }

  /**
   * Override the service registry for testing purposes.
   * @param registry - Registry to use for subsequent service creation.
   * @returns The previous registry for restoration.
   */
  static __setServiceRegistryForTesting(
    registry: Record<string, ServiceConstructor>,
  ): Record<string, ServiceConstructor> {
    const previous = this.serviceRegistry;
    this.serviceRegistry = registry;
    return previous;
  }

  /**
   * Read the current service registry for testing purposes.
   */
  static __getServiceRegistryForTesting(): Record<string, ServiceConstructor> {
    return { ...this.serviceRegistry };
  }
}

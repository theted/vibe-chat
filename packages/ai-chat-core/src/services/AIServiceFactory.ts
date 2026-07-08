/**
 * AI Service Factory
 *
 * This factory creates AI service instances based on the provider configuration.
 */

import { OpenAIService } from "./OpenAIService.js";
import { AnthropicService } from "./AnthropicService.js";
import { MistralService } from "./MistralService.js";
import { GeminiService } from "./GeminiService.js";
import { ZaiService } from "./ZaiService.js";
import { PerplexityService } from "./PerplexityService.js";
import {
  openAICompatibleServiceClass,
  openRouterServiceClass,
} from "./serviceClassFactory.js";
import { AI_PROVIDERS } from "@/config/aiProviders/index.js";
import { PROVIDER_BASE_URLS } from "@/config/aiProviders/constants.js";
import type { AIServiceConfig, IAIService } from "@/types/index.js";
import type {
  ServiceConstructor,
  ServiceConfigurationError,
} from "@/types/services.js";
import { BaseAIService } from "./base/BaseAIService.js";

// Providers proxied through OpenRouter with no provider-specific behavior;
// their display name is identical to the provider name.
const OPENROUTER_PROVIDERS = [
  AI_PROVIDERS.AMAZON,
  AI_PROVIDERS.ARCEE,
  AI_PROVIDERS.BAIDU,
  AI_PROVIDERS.BYTEDANCE,
  AI_PROVIDERS.DATABRICKS,
  AI_PROVIDERS.HUGGINGFACE,
  AI_PROVIDERS.INFLECTION,
  AI_PROVIDERS.MICROSOFT,
  AI_PROVIDERS.MINIMAX,
  AI_PROVIDERS.NOUS,
  AI_PROVIDERS.NVIDIA,
  AI_PROVIDERS.PHIND,
  AI_PROVIDERS.SNOWFLAKE,
  AI_PROVIDERS.STEPFUN,
  AI_PROVIDERS.XIAOMI,
  AI_PROVIDERS.ZEROONEAI,
];

export class AIServiceFactory {
  private static serviceRegistry: Record<string, ServiceConstructor> = {
    [AI_PROVIDERS.GEMINI.name]: GeminiService,
    [AI_PROVIDERS.MISTRAL.name]: MistralService,
    [AI_PROVIDERS.OPENAI.name]: OpenAIService,
    [AI_PROVIDERS.ANTHROPIC.name]: AnthropicService,
    [AI_PROVIDERS.ZAI.name]: ZaiService,
    [AI_PROVIDERS.PERPLEXITY.name]: PerplexityService,
    // Direct OpenAI-compatible APIs differing from the base only in display
    // name and default base URL. Display names are deliberate data: e.g.
    // "Deepseek" intentionally differs from AI_PROVIDERS.DEEPSEEK.name
    // ("DeepSeek"); deriving them would change service.getName() output.
    [AI_PROVIDERS.DEEPSEEK.name]: openAICompatibleServiceClass(
      "Deepseek",
      PROVIDER_BASE_URLS.DEEPSEEK,
    ),
    [AI_PROVIDERS.GROK.name]: openAICompatibleServiceClass(
      "Grok",
      PROVIDER_BASE_URLS.GROK,
    ),
    [AI_PROVIDERS.QWEN.name]: openAICompatibleServiceClass(
      "Qwen",
      PROVIDER_BASE_URLS.QWEN,
    ),
    [AI_PROVIDERS.KIMI.name]: openAICompatibleServiceClass(
      "Kimi",
      PROVIDER_BASE_URLS.KIMI,
    ),
    [AI_PROVIDERS.COHERE.name]: openAICompatibleServiceClass(
      "Cohere",
      PROVIDER_BASE_URLS.COHERE,
    ),
    [AI_PROVIDERS.LLAMA.name]: openAICompatibleServiceClass(
      "Meta",
      PROVIDER_BASE_URLS.LLAMA,
    ),
    ...Object.fromEntries(
      OPENROUTER_PROVIDERS.map((provider) => [
        provider.name,
        openRouterServiceClass(provider.name),
      ]),
    ),
    // Concrete services accept provider-specific config subtypes; the factory
    // always passes the matching provider's config, so the wider constructor
    // signature is safe here
  } as Record<string, ServiceConstructor>;

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

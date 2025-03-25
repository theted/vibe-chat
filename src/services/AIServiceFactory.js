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
import { AI_PROVIDERS } from "../config/aiProviders.js";

export class AIServiceFactory {
  /**
   * Create an AI service instance based on the provider configuration
   * @param {Object} config - Provider and model configuration
   * @returns {BaseAIService} An instance of the appropriate AI service
   * @throws {Error} If the provider is not supported
   */
  static createService(config) {
    const providerName = config.provider.name;

    switch (providerName) {
      case AI_PROVIDERS.GEMINI.name:
        return new GeminiService(config);
      case AI_PROVIDERS.MISTRAL.name:
        return new MistralService(config);
      case AI_PROVIDERS.OPENAI.name:
        return new OpenAIService(config);
      case AI_PROVIDERS.ANTHROPIC.name:
        return new AnthropicService(config);
      case AI_PROVIDERS.DEEPSEEK.name:
        return new DeepseekService(config);
      case AI_PROVIDERS.GROK.name:
        return new GrokService(config);
      default:
        throw new Error(`Unsupported AI provider: ${providerName}`);
    }
  }

  /**
   * Create an AI service instance for a specific provider and model
   * @param {string} providerKey - Provider key (e.g., "OPENAI")
   * @param {string} modelKey - Model key (e.g., "GPT4")
   * @returns {BaseAIService} An instance of the appropriate AI service
   * @throws {Error} If the provider or model is not found
   */
  static createServiceByName(providerKey, modelKey) {
    const provider = AI_PROVIDERS[providerKey];
    if (!provider) {
      throw new Error(`Provider not found: ${providerKey}`);
    }

    const model = provider.models[modelKey];
    if (!model) {
      throw new Error(
        `Model not found: ${modelKey} for provider ${providerKey}`
      );
    }

    return this.createService({ provider, model });
  }
}

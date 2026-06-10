/**
 * Service Class Factories
 *
 * Most providers need no provider-specific behavior beyond a display name
 * and (for direct OpenAI-compatible APIs) a default base URL. These factories
 * build ServiceConstructor-compatible classes from that data, so such
 * providers are registry entries in AIServiceFactory instead of one-off
 * subclass files. Providers with real custom logic (Anthropic, Gemini,
 * OpenAI, Mistral, Perplexity, Zai) keep dedicated classes.
 */

import { OpenAICompatibleService } from "./base/OpenAICompatibleService.js";
import { OpenRouterCompatibleService } from "./base/OpenRouterCompatibleService.js";
import type { OpenAIClient, ServiceConstructor } from "@/types/services.js";
import type { AIServiceConfig, ServiceInitOptions } from "@/types/index.js";
import OpenAI from "openai";

/**
 * Service class for a provider accessed via OpenRouter.
 */
export const openRouterServiceClass = (displayName: string): ServiceConstructor =>
  class extends OpenRouterCompatibleService {
    constructor(config: AIServiceConfig) {
      super(config, displayName);
    }
  };

/**
 * Service class for a provider with a direct OpenAI-compatible API,
 * differing from the base only in display name and default base URL.
 */
export const openAICompatibleServiceClass = (
  displayName: string,
  defaultBaseURL: string,
): ServiceConstructor =>
  class extends OpenAICompatibleService {
    constructor(config: AIServiceConfig) {
      super(config, displayName);
    }

    protected createClient(
      apiKey: string,
      options?: ServiceInitOptions,
    ): OpenAIClient {
      return new OpenAI({
        apiKey,
        baseURL: options?.baseURL || this.getBaseURL() || defaultBaseURL,
      }) as OpenAIClient;
    }
  };

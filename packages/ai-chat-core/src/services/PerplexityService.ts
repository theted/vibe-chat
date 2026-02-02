/**
 * Perplexity Service
 *
 * This service handles interactions with the Perplexity AI API.
 * Perplexity uses an OpenAI-compatible API format.
 */

import { OpenAICompatibleService } from "./base/OpenAICompatibleService.js";
import { PROVIDER_BASE_URLS } from "@/config/aiProviders/constants.js";
import type { OpenAIClient, OpenAICompletionRequest } from "@/types/services.js";
import type {
  AIServiceConfig,
  OpenAIMessage,
  ServiceInitOptions,
} from "@/types/index.js";
import OpenAI from "openai";

export class PerplexityService extends OpenAICompatibleService {
  constructor(config: AIServiceConfig) {
    super(config, "Perplexity");
  }

  protected createClient(
    apiKey: string,
    options?: ServiceInitOptions,
  ): OpenAIClient {
    return new OpenAI({
      apiKey,
      baseURL: options?.baseURL || this.getBaseURL() || PROVIDER_BASE_URLS.PERPLEXITY,
    }) as OpenAIClient;
  }

  /**
   * sonar-reasoning-pro model requires max_tokens to be omitted
   */
  protected prepareRequestParams(
    formattedMessages: OpenAIMessage[],
    context?: Record<string, unknown>,
  ): OpenAICompletionRequest {
    const params = super.prepareRequestParams(formattedMessages, context);
    if (this.getModel() === "sonar-reasoning-pro") {
      delete params.max_tokens;
    }
    return params;
  }
}

/**
 * Perplexity Service
 *
 * This service handles interactions with the Perplexity AI API.
 * Perplexity uses an OpenAI-compatible API format.
 */

import { OpenAICompatibleService } from "./base/OpenAICompatibleService.js";
import type { OpenAIClient, OpenAICompletionRequest } from "@/types/services.js";
import type {
  AIServiceConfig,
  OpenAIMessage,
  ServiceInitOptions,
} from "@/types/index.js";
import OpenAI from "openai";

const PERPLEXITY_BASE_URL = "https://api.perplexity.ai";

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
      baseURL: options?.baseURL || PERPLEXITY_BASE_URL,
    }) as OpenAIClient;
  }

  protected prepareRequestParams(
    formattedMessages: OpenAIMessage[],
    context?: Record<string, unknown>,
  ): OpenAICompletionRequest {
    const params = super.prepareRequestParams(formattedMessages, context);
    if (this.getModel() === "sonar-reasoning-pro") {
      // Empirically avoids empty responses for this model.
      delete params.max_tokens;
    }
    return params;
  }
}

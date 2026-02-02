/**
 * Llama Service
 *
 * This service handles interactions with Meta Llama via the Llama API.
 * Llama uses an OpenAI-compatible API format.
 */

import { OpenAICompatibleService } from "./base/OpenAICompatibleService.js";
import { PROVIDER_BASE_URLS } from "@/config/aiProviders/constants.js";
import type { OpenAIClient } from "@/types/services.js";
import type { AIServiceConfig, ServiceInitOptions } from "@/types/index.js";
import OpenAI from "openai";

export class LlamaService extends OpenAICompatibleService {
  constructor(config: AIServiceConfig) {
    super(config, "Meta");
  }

  protected createClient(
    apiKey: string,
    options?: ServiceInitOptions,
  ): OpenAIClient {
    return new OpenAI({
      apiKey,
      baseURL: options?.baseURL || this.getBaseURL() || PROVIDER_BASE_URLS.LLAMA,
    }) as OpenAIClient;
  }
}

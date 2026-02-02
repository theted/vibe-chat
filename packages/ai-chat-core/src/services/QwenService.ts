/**
 * Qwen Service
 *
 * This service handles interactions with the Qwen (Alibaba) API.
 * Qwen uses an OpenAI-compatible API format via DashScope.
 */

import { OpenAICompatibleService } from "./base/OpenAICompatibleService.js";
import { PROVIDER_BASE_URLS } from "@/config/aiProviders/constants.js";
import type { OpenAIClient } from "@/types/services.js";
import type { AIServiceConfig, ServiceInitOptions } from "@/types/index.js";
import OpenAI from "openai";

export class QwenService extends OpenAICompatibleService {
  constructor(config: AIServiceConfig) {
    super(config, "Qwen");
  }

  protected createClient(
    apiKey: string,
    options?: ServiceInitOptions,
  ): OpenAIClient {
    return new OpenAI({
      apiKey,
      baseURL: options?.baseURL || this.getBaseURL() || PROVIDER_BASE_URLS.QWEN,
    }) as OpenAIClient;
  }
}

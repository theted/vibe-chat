/**
 * Kimi Service
 *
 * This service handles interactions with the Kimi (Moonshot) API.
 * Kimi uses an OpenAI-compatible API format.
 */

import { OpenAICompatibleService } from "./base/OpenAICompatibleService.js";
import { PROVIDER_BASE_URLS } from "@/config/aiProviders/constants.js";
import type { OpenAIClient } from "@/types/services.js";
import type { AIServiceConfig, ServiceInitOptions } from "@/types/index.js";
import OpenAI from "openai";

export class KimiService extends OpenAICompatibleService {
  constructor(config: AIServiceConfig) {
    super(config, "Kimi");
  }

  protected createClient(
    apiKey: string,
    options?: ServiceInitOptions,
  ): OpenAIClient {
    return new OpenAI({
      apiKey,
      baseURL: options?.baseURL || this.getBaseURL() || PROVIDER_BASE_URLS.KIMI,
    }) as OpenAIClient;
  }
}

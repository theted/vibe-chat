/**
 * Zai Service
 *
 * This service handles interactions with the Zai API.
 * Zai uses an OpenAI-compatible API format.
 */

import { OpenAICompatibleService } from "./base/OpenAICompatibleService.js";
import { PROVIDER_BASE_URLS } from "@/config/aiProviders/constants.js";
import type { OpenAIClient } from "@/types/services.js";
import type { AIServiceConfig, ServiceInitOptions } from "@/types/index.js";
import OpenAI from "openai";

const getZaiBaseUrl = (): string =>
  process.env.Z_BASE_URL || process.env.ZAI_BASE_URL || PROVIDER_BASE_URLS.ZAI;

export class ZaiService extends OpenAICompatibleService {
  constructor(config: AIServiceConfig) {
    super(config, "Zai");
  }

  protected getBaseURL(): string {
    return getZaiBaseUrl();
  }

  protected createClient(
    apiKey: string,
    options?: ServiceInitOptions,
  ): OpenAIClient {
    return new OpenAI({
      apiKey,
      baseURL: options?.baseURL || getZaiBaseUrl(),
    }) as OpenAIClient;
  }
}

/**
 * Zai Service
 *
 * This service handles interactions with the Zai API.
 * Zai uses an OpenAI-compatible API format.
 */

import { OpenAICompatibleService } from "./base/OpenAICompatibleService.js";
import { OpenAIClient } from "@/types/services.js";
import { AIServiceConfig, ServiceInitOptions } from "@/types/index.js";
import OpenAI from "openai";

const ZAI_BASE_URL = "https://api.zaiapp.ai/v1";

export class ZaiService extends OpenAICompatibleService {
  constructor(config: AIServiceConfig) {
    super(config, "Zai");
  }

  protected createClient(apiKey: string, options?: ServiceInitOptions): OpenAIClient {
    return new OpenAI({
      apiKey,
      baseURL: options?.baseURL || ZAI_BASE_URL,
    }) as OpenAIClient;
  }
}

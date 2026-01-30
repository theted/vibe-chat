/**
 * Deepseek Service
 *
 * This service handles interactions with the Deepseek API.
 * Deepseek uses an OpenAI-compatible API format.
 */

import { OpenAICompatibleService } from "./base/OpenAICompatibleService.js";
import { OpenAIClient } from "../types/services.js";
import { AIServiceConfig, ServiceInitOptions } from "../types/index.js";
import OpenAI from "openai";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";

export class DeepseekService extends OpenAICompatibleService {
  constructor(config: AIServiceConfig) {
    super(config, "Deepseek");
  }

  protected createClient(apiKey: string, options?: ServiceInitOptions): OpenAIClient {
    return new OpenAI({
      apiKey,
      baseURL: options?.baseURL || DEEPSEEK_BASE_URL,
    }) as OpenAIClient;
  }
}

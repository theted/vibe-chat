/**
 * Kimi Service
 *
 * This service handles interactions with the Kimi (Moonshot) API.
 * Kimi uses an OpenAI-compatible API format.
 */

import { OpenAICompatibleService } from "./base/OpenAICompatibleService.js";
import { OpenAIClient } from "../types/services.js";
import { AIServiceConfig, ServiceInitOptions } from "../types/index.js";
import OpenAI from "openai";

const KIMI_BASE_URL = "https://api.moonshot.cn/v1";

export class KimiService extends OpenAICompatibleService {
  constructor(config: AIServiceConfig) {
    super(config, "Kimi");
  }

  protected createClient(apiKey: string, options?: ServiceInitOptions): OpenAIClient {
    return new OpenAI({
      apiKey,
      baseURL: options?.baseURL || KIMI_BASE_URL,
    }) as OpenAIClient;
  }
}

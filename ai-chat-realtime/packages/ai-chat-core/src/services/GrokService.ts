/**
 * Grok Service
 *
 * This service handles interactions with the Grok (xAI) API.
 * Grok uses an OpenAI-compatible API format.
 */

import { OpenAICompatibleService } from "./base/OpenAICompatibleService.js";
import { OpenAIClient } from "@/types/services.js";
import { AIServiceConfig, ServiceInitOptions } from "@/types/index.js";
import OpenAI from "openai";

const GROK_BASE_URL = "https://api.x.ai/v1";

export class GrokService extends OpenAICompatibleService {
  constructor(config: AIServiceConfig) {
    super(config, "Grok");
  }

  protected createClient(apiKey: string, options?: ServiceInitOptions): OpenAIClient {
    return new OpenAI({
      apiKey,
      baseURL: options?.baseURL || GROK_BASE_URL,
    }) as OpenAIClient;
  }
}

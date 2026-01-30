/**
 * Cohere Service
 *
 * This service handles interactions with the Cohere AI API.
 * Cohere uses an OpenAI-compatible API format.
 */

import { OpenAICompatibleService } from "./base/OpenAICompatibleService.js";
import { OpenAIClient } from "@/types/services.js";
import { AIServiceConfig, ServiceInitOptions } from "@/types/index.js";
import OpenAI from "openai";

const COHERE_BASE_URL = "https://api.cohere.ai/v1";

export class CohereService extends OpenAICompatibleService {
  constructor(config: AIServiceConfig) {
    super(config, "Cohere");
  }

  protected createClient(apiKey: string, options?: ServiceInitOptions): OpenAIClient {
    return new OpenAI({
      apiKey,
      baseURL: options?.baseURL || COHERE_BASE_URL,
    }) as OpenAIClient;
  }
}

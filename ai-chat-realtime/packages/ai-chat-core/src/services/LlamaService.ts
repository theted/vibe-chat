/**
 * Llama Service
 *
 * This service handles interactions with the Llama API.
 * Llama uses an OpenAI-compatible API format.
 */

import { OpenAICompatibleService } from "./base/OpenAICompatibleService.js";
import { OpenAIClient } from "../types/services.js";
import { AIServiceConfig, ServiceInitOptions } from "../types/index.js";
import OpenAI from "openai";

const LLAMA_BASE_URL = "https://api.llama-api.com/v1";

export class LlamaService extends OpenAICompatibleService {
  constructor(config: AIServiceConfig) {
    super(config, "Llama");
  }

  protected createClient(apiKey: string, options?: ServiceInitOptions): OpenAIClient {
    return new OpenAI({
      apiKey,
      baseURL: options?.baseURL || LLAMA_BASE_URL,
    }) as OpenAIClient;
  }
}

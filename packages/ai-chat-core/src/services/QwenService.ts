/**
 * Qwen Service
 *
 * This service handles interactions with the Qwen (Alibaba) API.
 * Qwen uses an OpenAI-compatible API format via DashScope.
 */

import { OpenAICompatibleService } from "./base/OpenAICompatibleService.js";
import { OpenAIClient } from "../types/services.js";
import { AIServiceConfig, ServiceInitOptions } from "../types/index.js";
import OpenAI from "openai";

const QWEN_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";

export class QwenService extends OpenAICompatibleService {
  constructor(config: AIServiceConfig) {
    super(config, "Qwen");
  }

  protected createClient(apiKey: string, options?: ServiceInitOptions): OpenAIClient {
    return new OpenAI({
      apiKey,
      baseURL: options?.baseURL || QWEN_BASE_URL,
    }) as OpenAIClient;
  }
}

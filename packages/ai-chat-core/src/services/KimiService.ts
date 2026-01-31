/**
 * Kimi Service
 *
 * This service handles interactions with the Kimi (Moonshot) API.
 * Kimi uses an OpenAI-compatible API format.
 */

import { OpenAICompatibleService } from "./base/OpenAICompatibleService.js";
import { OpenAIClient } from "@/types/services.js";
import { AIServiceConfig, ServiceInitOptions } from "@/types/index.js";
import OpenAI from "openai";

const KIMI_BASE_URL = "https://api.moonshot.cn/v1";

export class KimiService extends OpenAICompatibleService {
  constructor(config: AIServiceConfig) {
    super(config, "Kimi");
  }

  protected createClient(
    apiKey: string,
    options?: ServiceInitOptions,
  ): OpenAIClient {
    const baseURL = options?.baseURL || this.getBaseURL() || KIMI_BASE_URL;
    const defaultHeaders = this.getDefaultHeaders();
    const clientConfig: ConstructorParameters<typeof OpenAI>[0] = {
      apiKey,
      baseURL,
    };

    if (Object.keys(defaultHeaders).length > 0) {
      clientConfig.defaultHeaders = defaultHeaders;
    }

    if (options?.timeout || this.config.timeout) {
      clientConfig.timeout = options?.timeout || this.config.timeout;
    }

    return new OpenAI(clientConfig) as OpenAIClient;
  }
}

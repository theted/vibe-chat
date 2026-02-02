/**
 * OpenAI Service
 *
 * This service handles interactions with the OpenAI API.
 */

import { OpenAICompatibleService } from "./base/OpenAICompatibleService.js";
import type { OpenAIClient, OpenAIServiceConfig } from "@/types/services.js";
import type { AIServiceConfig, ServiceInitOptions } from "@/types/index.js";
import OpenAI from "openai";

export class OpenAIService extends OpenAICompatibleService {
  constructor(config: AIServiceConfig) {
    super(config, "OpenAI");
  }

  protected createClient(
    apiKey: string,
    options?: ServiceInitOptions,
  ): OpenAIClient {
    const clientConfig: ConstructorParameters<typeof OpenAI>[0] = { apiKey };
    const openaiConfig = this.config as OpenAIServiceConfig;

    if (openaiConfig.organization) {
      clientConfig.organization = openaiConfig.organization;
    }

    if (openaiConfig.project) {
      clientConfig.project = openaiConfig.project;
    }

    const baseURL = this.getBaseURL();
    if (baseURL) {
      clientConfig.baseURL = baseURL;
    }

    const defaultHeaders = this.getDefaultHeaders();
    if (Object.keys(defaultHeaders).length > 0) {
      clientConfig.defaultHeaders = defaultHeaders;
    }

    if (options?.timeout || this.config.timeout) {
      clientConfig.timeout = options?.timeout || this.config.timeout;
    }

    return new OpenAI(clientConfig) as OpenAIClient;
  }
}

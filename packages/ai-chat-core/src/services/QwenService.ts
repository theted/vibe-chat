/**
 * Qwen Service
 *
 * This service handles interactions with the Qwen (Alibaba) API.
 * Qwen uses an OpenAI-compatible API format via DashScope.
 */

import { OpenAICompatibleService } from "./base/OpenAICompatibleService.js";
import { PROVIDER_BASE_URLS } from "@/config/aiProviders/constants.js";
import type { OpenAIClient } from "@/types/services.js";
import type { AIServiceConfig, ServiceInitOptions } from "@/types/index.js";
import OpenAI from "openai";

export class QwenService extends OpenAICompatibleService {
  private baseUrlFallbacks: string[] = [];

  constructor(config: AIServiceConfig) {
    super(config, "Qwen");
  }

  private resolveModelId(modelId: string): string {
    if (!this.baseURL) {
      return modelId;
    }

    if (this.baseURL.includes("dashscope-us")) {
      const usModelMap: Record<string, string> = {
        "qwen-plus": "qwen-plus-us",
        "qwen-plus-us": "qwen-plus-us",
        "qwen-flash": "qwen-flash-us",
        "qwen-flash-us": "qwen-flash-us",
        "qwen-turbo": "qwen-flash-us",
        "qwen-max": "qwen-plus-us",
        "qwen3-coder-plus": "qwen-plus-us",
      };
      return usModelMap[modelId] || modelId;
    }

    return modelId;
  }

  getModel(): string {
    return this.resolveModelId(super.getModel());
  }

  private createClientWithBaseUrl(
    apiKey: string,
    baseURL: string,
  ): OpenAIClient {
    return new OpenAI({
      apiKey,
      baseURL: options?.baseURL || this.getBaseURL() || PROVIDER_BASE_URLS.QWEN,
    }) as OpenAIClient;
  }

  protected createClient(
    apiKey: string,
    options?: ServiceInitOptions,
  ): OpenAIClient {
    const { baseURL, fallback } = resolveQwenBaseUrl(options);
    this.baseURL = baseURL;
    this.baseUrlFallbacks = fallback;
    return this.createClientWithBaseUrl(apiKey, baseURL);
  }

  protected async makeAPIRequest(
    params: OpenAICompletionRequest,
  ): Promise<OpenAICompletionResponse> {
    try {
      return await super.makeAPIRequest(params);
    } catch (error) {
      if (
        error instanceof ServiceAPIError &&
        (error.statusCode === 401 ||
          error.statusCode === 403 ||
          error.statusCode === 404) &&
        this.baseUrlFallbacks.length > 0
      ) {
        const fallbackUrls = [...this.baseUrlFallbacks];
        this.baseUrlFallbacks = [];
        for (const baseURL of fallbackUrls) {
          const apiKey = process.env[this.config.provider.apiKeyEnvVar];
          if (!apiKey) {
            throw error;
          }
          this.baseURL = baseURL;
          this.client = this.createClientWithBaseUrl(apiKey, baseURL);
          try {
            return await super.makeAPIRequest(params);
          } catch (retryError) {
            const retryStatus =
              retryError instanceof ServiceAPIError
                ? retryError.statusCode
                : undefined;
            if (
              !retryStatus ||
              ![401, 403, 404].includes(retryStatus)
            ) {
              throw retryError;
            }
          }
        }
      }
      throw error;
    }
  }
}

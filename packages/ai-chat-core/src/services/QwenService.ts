/**
 * Qwen Service
 *
 * This service handles interactions with the Qwen (Alibaba) API.
 * Qwen uses an OpenAI-compatible API format via DashScope.
 */

import { OpenAICompatibleService } from "./base/OpenAICompatibleService.js";
import {
  OpenAIClient,
  OpenAICompletionRequest,
  OpenAICompletionResponse,
  ServiceAPIError,
} from "@/types/services.js";
import { AIServiceConfig, ServiceInitOptions } from "@/types/index.js";
import OpenAI from "openai";

const QWEN_BASE_URLS = {
  intl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
  us: "https://dashscope-us.aliyuncs.com/compatible-mode/v1",
  cn: "https://dashscope.aliyuncs.com/compatible-mode/v1",
} as const;

const normalizeRegion = (value?: string): keyof typeof QWEN_BASE_URLS | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (["us", "usa", "va", "virginia"].includes(normalized)) return "us";
  if (["intl", "international", "sg", "singapore"].includes(normalized)) {
    return "intl";
  }
  if (["cn", "china", "beijing", "bj"].includes(normalized)) return "cn";
  return null;
};

const resolveQwenBaseUrl = (
  options?: ServiceInitOptions,
): { baseURL: string; fallback: string[] } => {
  if (options?.baseURL) {
    return { baseURL: options.baseURL, fallback: [] };
  }

  const envBaseURL = process.env.QWEN_BASE_URL || process.env.DASHSCOPE_BASE_URL;
  if (envBaseURL) {
    return { baseURL: envBaseURL, fallback: [] };
  }

  const region = normalizeRegion(
    process.env.QWEN_REGION || process.env.DASHSCOPE_REGION,
  );
  if (region) {
    return { baseURL: QWEN_BASE_URLS[region], fallback: [] };
  }

  const ordered = [
    QWEN_BASE_URLS.us,
    QWEN_BASE_URLS.intl,
    QWEN_BASE_URLS.cn,
  ];
  const [baseURL, ...fallback] = ordered;
  return { baseURL, fallback };
};

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
      baseURL,
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

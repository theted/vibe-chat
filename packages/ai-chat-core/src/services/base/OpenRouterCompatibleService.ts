/**
 * OpenRouter-Compatible Service Base Class
 *
 * Shared implementation for providers accessed via OpenRouter's OpenAI-compatible API.
 */

import { OpenAICompatibleService } from "./OpenAICompatibleService.js";
import type { OpenAIClient } from "@/types/services.js";
import type { AIServiceConfig, ServiceInitOptions } from "@/types/index.js";
import OpenAI from "openai";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_OPENROUTER_APP_NAME = "AI Chat Application";
const DEFAULT_OPENROUTER_APP_URL = "http://localhost:3000";

export class OpenRouterCompatibleService extends OpenAICompatibleService {
  constructor(config: AIServiceConfig, name: string) {
    super(config, name);
  }

  protected getBaseURL(): string {
    return OPENROUTER_BASE_URL;
  }

  protected getDefaultHeaders(): Record<string, string> {
    const headers = { ...super.getDefaultHeaders() };
    const appUrl = process.env.OPENROUTER_APP_URL;
    const appName = process.env.OPENROUTER_APP_NAME;

    if (appUrl) {
      headers["HTTP-Referer"] = appUrl;
    }

    if (appName) {
      headers["X-Title"] = appName;
    }

    if (!headers["HTTP-Referer"]) {
      headers["HTTP-Referer"] = DEFAULT_OPENROUTER_APP_URL;
    }

    if (!headers["X-Title"]) {
      headers["X-Title"] = DEFAULT_OPENROUTER_APP_NAME;
    }

    return headers;
  }

  protected createClient(
    apiKey: string,
    options?: ServiceInitOptions,
  ): OpenAIClient {
    const baseURL = options?.baseURL || this.getBaseURL();
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

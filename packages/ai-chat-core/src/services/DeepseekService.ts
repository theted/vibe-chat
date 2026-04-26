/**
 * Deepseek Service
 *
 * This service handles interactions with the Deepseek API.
 * Deepseek uses an OpenAI-compatible API format.
 */

import { OpenAICompatibleService } from "./base/OpenAICompatibleService.js";
import { inlineSystemIntoFirstUser } from "@/utils/aiFormatting.js";
import { PROVIDER_BASE_URLS } from "@/config/aiProviders/constants.js";
import type { OpenAIClient, OpenAICompletionRequest } from "@/types/services.js";
import type { AIServiceConfig, ServiceInitOptions, OpenAIMessage } from "@/types/index.js";
import OpenAI from "openai";

const DEEPSEEK_REASONER_MODEL = "deepseek-reasoner";

export class DeepseekService extends OpenAICompatibleService {
  constructor(config: AIServiceConfig) {
    super(config, "Deepseek");
  }

  private isReasonerModel(): boolean {
    return this.getModel() === DEEPSEEK_REASONER_MODEL;
  }

  /**
   * deepseek-reasoner does not support system role — inline into first user message
   */
  protected processMessages(messages: OpenAIMessage[]): OpenAIMessage[] {
    if (this.isReasonerModel()) {
      return inlineSystemIntoFirstUser(messages);
    }
    return messages;
  }

  /**
   * deepseek-reasoner does not support temperature
   */
  protected prepareRequestParams(
    formattedMessages: OpenAIMessage[],
    context?: Record<string, unknown>,
  ): OpenAICompletionRequest {
    const params = super.prepareRequestParams(formattedMessages, context);
    if (this.isReasonerModel()) {
      delete (params as unknown as Record<string, unknown>).temperature;
    }
    return params;
  }

  protected createClient(
    apiKey: string,
    options?: ServiceInitOptions,
  ): OpenAIClient {
    return new OpenAI({
      apiKey,
      baseURL: options?.baseURL || this.getBaseURL() || PROVIDER_BASE_URLS.DEEPSEEK,
    }) as OpenAIClient;
  }
}

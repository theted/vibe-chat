/**
 * Mistral Service
 *
 * This service handles interactions with the Mistral AI API.
 */

import { OpenAICompatibleService } from "./base/OpenAICompatibleService.js";
import { PROVIDER_BASE_URLS } from "@/config/aiProviders/constants.js";
import type { OpenAIClient } from "@/types/services.js";
import type {
  AIServiceConfig,
  ServiceInitOptions,
  OpenAIMessage,
} from "@/types/index.js";
import OpenAI from "openai";

export class MistralService extends OpenAICompatibleService {
  constructor(config: AIServiceConfig) {
    super(config, "Mistral");
  }

  protected createClient(
    apiKey: string,
    options?: ServiceInitOptions,
  ): OpenAIClient {
    return new OpenAI({
      apiKey,
      baseURL: options?.baseURL || this.getBaseURL() || PROVIDER_BASE_URLS.MISTRAL,
    }) as OpenAIClient;
  }

  /**
   * Mistral requires system messages first, and last message must be from user
   */
  protected processMessages(messages: OpenAIMessage[]): OpenAIMessage[] {
    const systemMessages = messages.filter((m) => m.role === "system");
    const nonSystemMessages = messages.filter((m) => m.role !== "system");
    const orderedMessages = [...systemMessages, ...nonSystemMessages];

    const lastMessage = orderedMessages[orderedMessages.length - 1];
    if (lastMessage?.role === "assistant") {
      orderedMessages.push({
        role: "user",
        content: `Please respond to this message: "${lastMessage.content}"`,
      });
    }

    return orderedMessages;
  }
}

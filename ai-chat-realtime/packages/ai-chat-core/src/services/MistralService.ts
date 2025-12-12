/**
 * Mistral Service
 *
 * This service handles interactions with the Mistral AI API.
 */

import { OpenAICompatibleService } from './base/OpenAICompatibleService.js';
import { OpenAIClient } from '../types/services.js';
import { AIServiceConfig, ServiceInitOptions, OpenAIMessage } from '../types/index.js';
import { Mistral } from '@mistralai/mistralai';

export class MistralService extends OpenAICompatibleService {
  constructor(config: AIServiceConfig) {
    super(config, 'Mistral');
  }

  /**
   * Create the Mistral client (which is OpenAI-compatible)
   */
  protected createClient(apiKey: string, options?: ServiceInitOptions): OpenAIClient {
    return new Mistral({
      apiKey
    }) as unknown as OpenAIClient;
  }

  /**
   * Process messages for Mistral-specific requirements
   * Mistral requires: system messages first, then alternating user/assistant
   * Last message must be from user or tool, not assistant
   */
  protected processMessages(messages: OpenAIMessage[]): OpenAIMessage[] {
    // Ensure system messages are at the beginning
    const systemMessages = messages.filter(m => m.role === 'system');
    const nonSystemMessages = messages.filter(m => m.role !== 'system');
    const orderedMessages = [...systemMessages, ...nonSystemMessages];

    const lastMessage = orderedMessages[orderedMessages.length - 1];

    // If last message is assistant, append user message to satisfy Mistral requirements
    if (lastMessage?.role === "assistant") {
      orderedMessages.push({
        role: "user",
        content: `Please respond to this message: "${lastMessage.content}"`,
      });
    }

    return orderedMessages;
  }
}
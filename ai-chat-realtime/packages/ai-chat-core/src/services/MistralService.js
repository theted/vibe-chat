/**
 * Mistral Service
 *
 * This service handles interactions with the Mistral AI API.
 */

import { BaseAIService } from "./BaseAIService.js";
import pkg from "@mistralai/mistralai";
import { mapToOpenAIChat } from "../utils/aiFormatting.js";
import dotenv from "dotenv";

dotenv.config();

export class MistralService extends BaseAIService {
  constructor(config) {
    super(config);
    this.name = "Mistral";
    this.client = null;
  }

  /**
   * Initialize the Mistral client
   * @returns {Promise<void>}
   */
  async initialize() {
    if (!this.isConfigured()) {
      throw new Error("Mistral API key is not configured");
    }

    this.client = new pkg.Mistral(
      process.env[this.config.provider.apiKeyEnvVar]
    );
  }

  /**
   * Check if the Mistral service is properly configured
   * @returns {boolean} True if the API key is available
   */
  isConfigured() {
    return !!process.env[this.config.provider.apiKeyEnvVar];
  }

  /**
   * Generate a response using Mistral
   * @param {Array} messages - Array of message objects with role and content
   * @returns {Promise<string>} The generated response
   */
  async generateResponse(messages) {
    if (!this.client) {
      await this.initialize();
    }

    try {
      // Format messages for Mistral API
      // Mistral requires: system messages first, then alternating user/assistant
      // Last message must be from user or tool, not assistant
      const formattedMessages = mapToOpenAIChat(messages);

      // Ensure system messages are at the beginning
      const systemMessages = formattedMessages.filter(m => m.role === 'system');
      const nonSystemMessages = formattedMessages.filter(m => m.role !== 'system');
      const orderedMessages = [...systemMessages, ...nonSystemMessages];

      const lastMessage = orderedMessages[orderedMessages.length - 1];

      // If last message is assistant, append user message to satisfy Mistral requirements
      if (lastMessage?.role === "assistant") {
        orderedMessages.push({
          role: "user",
          content: `Please respond to this message: "${lastMessage.content}"`,
        });
      }

      const response = await this.client.chat.complete({
        model: this.config.model.id,
        messages: orderedMessages,
        max_tokens: this.config.model.maxTokens,
        temperature: this.config.model.temperature,
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error(`Mistral API Error: ${error.message}`);
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }
}

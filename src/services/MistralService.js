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
      // Mistral expects the last message to be from a user or tool, not an assistant
      const formattedMessages = mapToOpenAIChat(messages);
      const lastMessage = formattedMessages[formattedMessages.length - 1];

      // If the last message is from an assistant, convert it to a user message
      // This is a workaround for Mistral's requirement that the last message be from a user or tool
      if (lastMessage.role === "assistant") {
        formattedMessages.push({
          role: "user",
          content: `Please respond to this message: "${lastMessage.content}"`,
        });
      } else {
        formattedMessages.push(lastMessage);
      }

      const response = await this.client.chat.complete({
        model: this.config.model.id,
        messages: formattedMessages,
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

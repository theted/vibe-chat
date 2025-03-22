/**
 * Anthropic Service
 *
 * This service handles interactions with the Anthropic API.
 */

import { BaseAIService } from "./BaseAIService.js";
import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";

dotenv.config();

export class AnthropicService extends BaseAIService {
  constructor(config) {
    super(config);
    this.name = "Anthropic";
    this.client = null;
  }

  /**
   * Initialize the Anthropic client
   * @returns {Promise<void>}
   */
  async initialize() {
    if (!this.isConfigured()) {
      throw new Error("Anthropic API key is not configured");
    }

    this.client = new Anthropic({
      apiKey: process.env[this.config.provider.apiKeyEnvVar],
    });
  }

  /**
   * Check if the Anthropic service is properly configured
   * @returns {boolean} True if the API key is available
   */
  isConfigured() {
    return !!process.env[this.config.provider.apiKeyEnvVar];
  }

  /**
   * Generate a response using Anthropic
   * @param {Array} messages - Array of message objects with role and content
   * @returns {Promise<string>} The generated response
   */
  async generateResponse(messages) {
    if (!this.client) {
      await this.initialize();
    }

    try {
      // Convert messages to Anthropic format
      const formattedMessages = messages
        .map((msg) => {
          // Map OpenAI roles to Anthropic roles
          let role = msg.role;
          if (role === "user") {
            role = "human";
          } else if (role === "assistant") {
            role = "assistant";
          } else if (role === "system") {
            // System messages are handled differently in Anthropic
            return null;
          }

          return {
            role,
            content: msg.content,
          };
        })
        .filter(Boolean); // Remove null entries (system messages)

      const response = await this.client.messages.create({
        model: this.config.model.id,
        messages: formattedMessages,
        max_tokens: this.config.model.maxTokens,
        temperature: this.config.model.temperature,
        system: this.config.model.systemPrompt,
      });

      return response.content[0].text;
    } catch (error) {
      console.error(`Anthropic API Error: ${error.message}`);
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }
}

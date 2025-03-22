/**
 * Deepseek Service
 *
 * This service handles interactions with the Deepseek API.
 */

import { BaseAIService } from "./BaseAIService.js";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

export class DeepseekService extends BaseAIService {
  constructor(config) {
    super(config);
    this.name = "Deepseek";
    this.client = null;
  }

  /**
   * Initialize the Deepseek client
   * @returns {Promise<void>}
   */
  async initialize() {
    if (!this.isConfigured()) {
      throw new Error("Deepseek API key is not configured");
    }

    // Deepseek uses the OpenAI client with a different base URL
    this.client = new OpenAI({
      apiKey: process.env[this.config.provider.apiKeyEnvVar],
      baseURL: "https://api.deepseek.com/v1",
    });
  }

  /**
   * Check if the Deepseek service is properly configured
   * @returns {boolean} True if the API key is available
   */
  isConfigured() {
    return !!process.env[this.config.provider.apiKeyEnvVar];
  }

  /**
   * Generate a response using Deepseek
   * @param {Array} messages - Array of message objects with role and content
   * @returns {Promise<string>} The generated response
   */
  async generateResponse(messages) {
    if (!this.client) {
      await this.initialize();
    }

    try {
      // Format messages for Deepseek API (same format as OpenAI)
      const formattedMessages = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await this.client.chat.completions.create({
        model: this.config.model.id,
        messages: formattedMessages,
        max_tokens: this.config.model.maxTokens,
        temperature: this.config.model.temperature,
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error(`Deepseek API Error: ${error.message}`);
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }
}

/**
 * OpenAI Service
 *
 * This service handles interactions with the OpenAI API.
 */

import { BaseAIService } from "./BaseAIService.js";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

export class OpenAIService extends BaseAIService {
  constructor(config) {
    super(config);
    this.name = "OpenAI";
    this.client = null;
  }

  /**
   * Initialize the OpenAI client
   * @returns {Promise<void>}
   */
  async initialize() {
    if (!this.isConfigured()) {
      throw new Error("OpenAI API key is not configured");
    }

    this.client = new OpenAI({
      apiKey: process.env[this.config.provider.apiKeyEnvVar],
    });
  }

  /**
   * Check if the OpenAI service is properly configured
   * @returns {boolean} True if the API key is available
   */
  isConfigured() {
    return !!process.env[this.config.provider.apiKeyEnvVar];
  }

  /**
   * Generate a response using OpenAI
   * @param {Array} messages - Array of message objects with role and content
   * @returns {Promise<string>} The generated response
   */
  async generateResponse(messages) {
    if (!this.client) {
      await this.initialize();
    }

    try {
      const formattedMessages = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Add system message if not present
      if (!formattedMessages.some((msg) => msg.role === "system")) {
        formattedMessages.unshift({
          role: "system",
          content: this.config.model.systemPrompt,
        });
      }

      const response = await this.client.chat.completions.create({
        model: this.config.model.id,
        messages: formattedMessages,
        max_tokens: this.config.model.maxTokens,
        temperature: this.config.model.temperature,
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error(`OpenAI API Error: ${error.message}`);
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }
}

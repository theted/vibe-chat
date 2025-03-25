/**
 * Grok Service
 *
 * This service handles interactions with the Grok AI API.
 */

import { BaseAIService } from "./BaseAIService.js";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

export class GrokService extends BaseAIService {
  constructor(config) {
    super(config);
    this.name = "Grok";
    this.client = null;
  }

  /**
   * Initialize the Grok client
   * @returns {Promise<void>}
   */
  async initialize() {
    if (!this.isConfigured()) {
      throw new Error("Grok API key is not configured");
    }

    // No client initialization needed as we'll use fetch directly
    this.apiKey = process.env[this.config.provider.apiKeyEnvVar];
    this.apiEndpoint = "https://api.x.ai/v1/chat/completions";
  }

  /**
   * Check if the Grok service is properly configured
   * @returns {boolean} True if the API key is available
   */
  isConfigured() {
    return !!process.env[this.config.provider.apiKeyEnvVar];
  }

  /**
   * Generate a response using Grok
   * @param {Array} messages - Array of message objects with role and content
   * @returns {Promise<string>} The generated response
   */
  async generateResponse(messages) {
    if (!this.apiKey) {
      await this.initialize();
    }

    try {
      // Format messages for Grok API
      const formattedMessages = messages.map((message) => ({
        role: message.role,
        content: message.content,
      }));

      // Add system message if not present
      if (!formattedMessages.some((msg) => msg.role === "system")) {
        formattedMessages.unshift({
          role: "system",
          content: this.config.model.systemPrompt,
        });
      }

      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
        },
        body: JSON.stringify({
          model: this.config.model.id,
          messages: formattedMessages,
          max_tokens: this.config.model.maxTokens,
          temperature: this.config.model.temperature,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Grok API Error: ${response.status} - ${JSON.stringify(errorData)}`
        );
      }

      const data = await response.json();

      if (!data.choices || !data.choices.length) {
        throw new Error(
          `Grok API returned an unexpected response format: ${JSON.stringify(
            data
          )}`
        );
      }

      return data.choices[0].message.content;
    } catch (error) {
      console.error(`Grok API Error: ${error.message}`);
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }
}

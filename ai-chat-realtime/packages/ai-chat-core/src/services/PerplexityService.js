/**
 * Perplexity Service
 *
 * Handles interactions with the Perplexity API.
 */

import { BaseAIService } from "./BaseAIService.js";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { mapToOpenAIChat } from "../utils/aiFormatting.js";

dotenv.config();

export class PerplexityService extends BaseAIService {
  constructor(config) {
    super(config);
    this.name = "Perplexity";
    this.apiKey = null;
    this.apiEndpoint = null;
  }

  /**
   * Initialize the Perplexity client configuration
   * @returns {Promise<void>}
   */
  async initialize() {
    if (!this.isConfigured()) {
      throw new Error("Perplexity API key is not configured");
    }

    const baseUrl =
      process.env.PERPLEXITY_BASE_URL || "https://api.perplexity.ai";

    this.apiKey = process.env[this.config.provider.apiKeyEnvVar];
    this.apiEndpoint = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  }

  /**
   * Check if the Perplexity service is properly configured
   * @returns {boolean} True if the API key is available
   */
  isConfigured() {
    return !!process.env[this.config.provider.apiKeyEnvVar];
  }

  /**
   * Generate a response using Perplexity
   * @param {Array} messages - Conversation history
   * @returns {Promise<string>} The generated response
   */
  async generateResponse(messages) {
    if (!this.apiEndpoint) {
      await this.initialize();
    }

    try {
      const formattedMessages = mapToOpenAIChat(messages);

      if (!formattedMessages.some((msg) => msg.role === "system")) {
        formattedMessages.unshift({
          role: "system",
          content: this.getEnhancedSystemPrompt(),
        });
      }

      const payload = {
        model: this.config.model.id,
        messages: formattedMessages,
        temperature: this.config.model.temperature,
        max_tokens: this.config.model.maxTokens,
      };

      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Perplexity API Error: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();

      if (!data?.choices?.length || !data.choices[0].message) {
        throw new Error(
          `Perplexity API returned an unexpected response format: ${JSON.stringify(
            data
          )}`
        );
      }

      return data.choices[0].message.content;
    } catch (error) {
      console.error(`Perplexity API Error: ${error.message}`);
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }
}

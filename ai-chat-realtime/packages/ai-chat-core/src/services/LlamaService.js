/**
 * Llama Service
 *
 * Handles interactions with the Meta Llama API (OpenAI-compatible schema).
 */

import { BaseAIService } from "./BaseAIService.js";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { mapToOpenAIChat } from "../utils/aiFormatting.js";

dotenv.config();

export class LlamaService extends BaseAIService {
  constructor(config) {
    super(config);
    this.name = "Llama";
    this.apiKey = null;
    this.apiEndpoint = null;
  }

  /**
   * Initialize the Llama client configuration
   * @returns {Promise<void>}
   */
  async initialize() {
    if (!this.isConfigured()) {
      throw new Error("Llama API key is not configured");
    }

    const baseUrl =
      process.env.LLAMA_BASE_URL || "https://api.llama.com/v1";

    this.apiKey = process.env[this.config.provider.apiKeyEnvVar];
    this.apiEndpoint = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  }

  /**
   * Check if the Llama service is properly configured
   * @returns {boolean} True if the API key is available
   */
  isConfigured() {
    return !!process.env[this.config.provider.apiKeyEnvVar];
  }

  /**
   * Generate a response using Llama
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
          `Llama API Error: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();

      if (!data?.choices?.length || !data.choices[0].message) {
        throw new Error(
          `Llama API returned an unexpected response format: ${JSON.stringify(
            data
          )}`
        );
      }

      return data.choices[0].message.content;
    } catch (error) {
      console.error(`Llama API Error: ${error.message}`);
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }
}

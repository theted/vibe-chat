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
      // Extract system message if present
      let systemPrompt = this.getEnhancedSystemPrompt();
      let formattedMessages = [];

      // Find and extract system message
      const systemMessageIndex = messages.findIndex(
        (msg) => msg.role === "system"
      );
      if (systemMessageIndex !== -1) {
        systemPrompt = messages[systemMessageIndex].content;
        // Remove system message from the array
        formattedMessages = messages
          .filter((_, index) => index !== systemMessageIndex)
          .map((msg) => ({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.content.trim(), // Trim whitespace to avoid API errors
          }));
      } else {
        // No system message found, use default formatting
        formattedMessages = messages
          .map((msg) => {
            if (msg.role === "system") return null;
            return {
              role: msg.role === "user" ? "user" : "assistant",
              content: msg.content.trim(), // Trim whitespace to avoid API errors
            };
          })
          .filter(Boolean); // Remove null entries (system messages)
      }

      const response = await this.client.messages.create({
        model: this.config.model.id,
        messages: formattedMessages,
        max_tokens: this.config.model.maxTokens,
        temperature: this.config.model.temperature,
        system: systemPrompt,
      });

      // Handle the response structure properly
      if (response && response.content && Array.isArray(response.content)) {
        // Handle empty content array (valid response, model chose not to generate text)
        if (response.content.length === 0) {
          console.warn(
            "Anthropic returned empty content array. Stop reason:",
            response.stop_reason
          );
          // Return empty string or default message based on stop reason
          if (response.stop_reason === "end_turn") {
            return ""; // Model completed but had nothing to say
          }
          return ""; // Other stop reasons - return empty
        }

        const contentItem = response.content[0];
        let responseText = "";

        // Check for different possible structures
        if (contentItem.type === "text" && contentItem.text) {
          responseText = contentItem.text;
        } else if (contentItem.text) {
          responseText = contentItem.text;
        } else if (contentItem.value) {
          responseText = contentItem.value;
        }

        return responseText;
      }

      // If we reach here, response structure is truly unexpected
      console.error(
        "Unexpected Anthropic response structure:",
        JSON.stringify(response, null, 2)
      );
      throw new Error(
        "Failed to parse Anthropic response: unexpected response structure"
      );
    } catch (error) {
      console.error(`Anthropic API Error: ${error.message}`);
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }
}

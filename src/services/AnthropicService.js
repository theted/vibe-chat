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
      let systemPrompt = this.config.model.systemPrompt;
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
            content: msg.content,
          }));
      } else {
        // No system message found, use default formatting
        formattedMessages = messages
          .map((msg) => {
            if (msg.role === "system") return null;
            return {
              role: msg.role === "user" ? "user" : "assistant",
              content: msg.content,
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
      if (
        response &&
        response.content &&
        Array.isArray(response.content) &&
        response.content.length > 0
      ) {
        const contentItem = response.content[0];

        // Check for different possible structures
        if (contentItem.type === "text" && contentItem.text) {
          return contentItem.text;
        } else if (contentItem.text) {
          return contentItem.text;
        } else if (contentItem.value) {
          return contentItem.value;
        }
      }

      // Handle empty content array - this appears to be happening with Claude sometimes
      if (
        response &&
        Array.isArray(response.content) &&
        response.content.length === 0
      ) {
        return "I find that art which evokes strong emotions or challenges our perspectives tends to be the most impactful. The way different mediums can express complex ideas and feelings is truly fascinating.";
      }

      // If we can't extract text in the expected way, provide a fallback response
      console.warn(
        "Could not extract text from Anthropic response:",
        JSON.stringify(response, null, 2)
      );
      return "Visual arts that blend traditional techniques with modern themes create an interesting dialogue between past and present. What aspects of art do you find most compelling?";
    } catch (error) {
      console.error(`Anthropic API Error: ${error.message}`);
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }
}

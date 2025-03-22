/**
 * Gemini Service
 *
 * This service handles interactions with the Google Gemini AI API.
 */

import { BaseAIService } from "./BaseAIService.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

export class GeminiService extends BaseAIService {
  constructor(config) {
    super(config);
    this.name = "Gemini";
    this.client = null;
    this.model = null;
  }

  /**
   * Initialize the Gemini client
   * @returns {Promise<void>}
   */
  async initialize() {
    if (!this.isConfigured()) {
      throw new Error("Google AI API key is not configured");
    }

    this.client = new GoogleGenerativeAI(
      process.env[this.config.provider.apiKeyEnvVar]
    );
    this.model = this.client.getGenerativeModel({
      model: this.config.model.id,
    });
  }

  /**
   * Check if the Gemini service is properly configured
   * @returns {boolean} True if the API key is available
   */
  isConfigured() {
    return !!process.env[this.config.provider.apiKeyEnvVar];
  }

  /**
   * Generate a response using Gemini
   * @param {Array} messages - Array of message objects with role and content
   * @returns {Promise<string>} The generated response
   */
  async generateResponse(messages) {
    if (!this.client || !this.model) {
      await this.initialize();
    }

    try {
      // Format messages for Gemini API
      // Gemini uses a different format than OpenAI/Anthropic
      const formattedMessages = [];

      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];

        // Skip the system message as Gemini handles it differently
        if (msg.role === "system") {
          continue;
        }

        // Map the roles to Gemini format
        const role = msg.role === "assistant" ? "model" : "user";

        formattedMessages.push({
          role: role,
          parts: [{ text: msg.content }],
        });
      }

      // Create a chat session
      const chat = this.model.startChat({
        generationConfig: {
          maxOutputTokens: this.config.model.maxTokens,
          temperature: this.config.model.temperature,
        },
      });

      // Send the messages to the chat session
      const result = await chat.sendMessageStream(formattedMessages);

      // Collect the response
      let responseText = "";
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        responseText += chunkText;
      }

      return responseText;
    } catch (error) {
      console.error(`Gemini API Error: ${error.message}`);
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }
}

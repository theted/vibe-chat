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
      // Create a chat session
      const chat = this.model.startChat({
        generationConfig: {
          maxOutputTokens: this.config.model.maxTokens,
          temperature: this.config.model.temperature,
        },
      });

      // Process the conversation history
      // We need to send messages one by one to build the conversation
      let lastUserMessage = null;

      // Find messages in pairs (user followed by assistant)
      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];

        // Skip system messages as they're handled separately
        if (msg.role === "system") {
          continue;
        }

        if (msg.role === "user") {
          // Store user message to send later
          lastUserMessage = msg.content;
        } else if (msg.role === "assistant" && lastUserMessage) {
          // If we have a user message followed by an assistant message,
          // send them to build the conversation history
          await chat.sendMessage(lastUserMessage);
          await chat.sendMessage(msg.content);
          lastUserMessage = null;
        }
      }

      // Send the final user message and get the response
      let result;
      if (lastUserMessage) {
        result = await chat.sendMessageStream(lastUserMessage);
      } else {
        // If there's no final user message, use the last message in the array
        const lastMessage = messages[messages.length - 1];
        if (lastMessage.role !== "system") {
          result = await chat.sendMessageStream(lastMessage.content);
        } else {
          throw new Error("No valid message to send to Gemini");
        }
      }

      // Collect the response
      let responseText = "";
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        responseText += chunkText;
      }

      // Limit response length to approximately 2-3 sentences
      const sentences = responseText.split(/[.!?]+\s+/);
      if (sentences.length > 3) {
        // Take first 3 sentences and add appropriate punctuation
        responseText = sentences.slice(0, 3).join(". ") + ".";
      }

      return responseText;
    } catch (error) {
      console.error(`Gemini API Error: ${error.message}`);
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }
}

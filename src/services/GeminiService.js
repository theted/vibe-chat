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
      // Use system instructions to set the model behavior consistently
      systemInstruction: this.config.model.systemPrompt,
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
      // Convert the conversation into Gemini history (skip system messages)
      const nonSystem = messages.filter((m) => m.role !== "system");

      // Find the last user message to send as the live input
      const lastUserIndex = [...nonSystem]
        .reverse()
        .findIndex((m) => m.role === "user");

      if (lastUserIndex === -1) {
        throw new Error("No user message found to send to Gemini");
      }

      const actualLastUserIndex = nonSystem.length - 1 - lastUserIndex;
      const historyMessages = nonSystem.slice(0, actualLastUserIndex);
      const lastUserMessage = nonSystem[actualLastUserIndex].content;

      const history = historyMessages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      // Create a chat with proper history
      const chat = this.model.startChat({
        generationConfig: {
          maxOutputTokens: this.config.model.maxTokens,
          temperature: this.config.model.temperature,
        },
        history,
      });

      // Send the final user message and stream the response
      const result = await chat.sendMessageStream(lastUserMessage);

      // Collect the response
      let responseText = "";
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        responseText += chunkText;
      }

      // Limit response length to approximately 3-6 sentences
      const sentences = responseText.split(/[.!?]+\s+/);
      if (sentences.length > 6) {
        responseText = sentences.slice(0, 6).join(". ") + ".";
      }

      return responseText;
    } catch (error) {
      console.error(`Gemini API Error: ${error.message}`);
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }
}

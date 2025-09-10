/**
 * Qwen Service
 *
 * This service integrates Qwen via an OpenAI-compatible API.
 * Configure base URL with `QWEN_BASE_URL` if needed.
 */

import { BaseAIService } from "./BaseAIService.js";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

export class QwenService extends BaseAIService {
  constructor(config) {
    super(config);
    this.name = "Qwen";
    this.client = null;
  }

  /**
   * Initialize the Qwen client using an OpenAI-compatible endpoint
   */
  async initialize() {
    if (!this.isConfigured()) {
      throw new Error("Qwen API key is not configured");
    }

    const apiKey = process.env[this.config.provider.apiKeyEnvVar];
    const baseURL =
      process.env.QWEN_BASE_URL ||
      process.env.QWEN_OPENAI_BASE_URL ||
      // Common default for DashScope OpenAI-compatible API; override via env if different
      "https://dashscope.aliyuncs.com/compatible-mode/v1";

    this.client = new OpenAI({ apiKey, baseURL });
  }

  /**
   * Check if the Qwen service is properly configured
   */
  isConfigured() {
    return !!process.env[this.config.provider.apiKeyEnvVar];
  }

  /**
   * Generate a response using Qwen (OpenAI-compatible chat)
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

      const response = await this.client.chat.completions.create({
        model: this.config.model.id,
        messages: formattedMessages,
        max_tokens: this.config.model.maxTokens,
        temperature: this.config.model.temperature,
      });

      const content = response?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error(
          `Qwen API returned an unexpected response format: ${JSON.stringify(
            response
          ).slice(0, 400)}`
        );
      }
      return content;
    } catch (error) {
      console.error(`Qwen API Error: ${error.message}`);
      throw new Error(
        `Failed to generate response from Qwen: ${error.message}. If you're using DashScope or another gateway, set QWEN_BASE_URL to its OpenAI-compatible endpoint.`
      );
    }
  }
}


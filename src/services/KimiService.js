/**
 * Kimi (Moonshot AI) Service
 *
 * Uses an OpenAI-compatible endpoint. Set `KIMI_BASE_URL` if needed.
 */

import { BaseAIService } from "./BaseAIService.js";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

export class KimiService extends BaseAIService {
  constructor(config) {
    super(config);
    this.name = "Kimi";
    this.client = null;
  }

  async initialize() {
    if (!this.isConfigured()) {
      throw new Error("Kimi API key is not configured");
    }

    const apiKey = process.env[this.config.provider.apiKeyEnvVar];
    const baseURL =
      process.env.KIMI_BASE_URL ||
      // Default Moonshot OpenAI-compatible base URL
      "https://api.moonshot.cn/v1";

    this.client = new OpenAI({ apiKey, baseURL });
  }

  isConfigured() {
    return !!process.env[this.config.provider.apiKeyEnvVar];
  }

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
          `Kimi API returned an unexpected response format: ${JSON.stringify(
            response
          ).slice(0, 400)}`
        );
      }
      return content;
    } catch (error) {
      console.error(`Kimi API Error: ${error.message}`);
      throw new Error(
        `Failed to generate response from Kimi: ${error.message}. If needed, set KIMI_BASE_URL to the OpenAI-compatible endpoint.`
      );
    }
  }
}


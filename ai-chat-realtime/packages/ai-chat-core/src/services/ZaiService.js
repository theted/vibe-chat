/**
 * Z.ai Service
 *
 * Implements Z.ai via an OpenAI-compatible API. Configure base URL with
 * `Z_BASE_URL` (or `ZAI_BASE_URL`) if needed.
 */

import { BaseAIService } from "./BaseAIService.js";
import OpenAI from "openai";
import dotenv from "dotenv";
import {
  inlineSystemIntoFirstUser,
  mapToOpenAIChat,
} from "../utils/aiFormatting.js";

dotenv.config();

export class ZaiService extends BaseAIService {
  constructor(config) {
    super(config);
    this.name = "Z.ai";
    this.client = null;
  }

  /**
   * Initialize the Z.ai client using an OpenAI-compatible endpoint
   */
  async initialize() {
    if (!this.isConfigured()) {
      throw new Error("Z.ai API key is not configured");
    }

    const apiKey = process.env[this.config.provider.apiKeyEnvVar];
    const baseURL =
      process.env.Z_BASE_URL ||
      process.env.ZAI_BASE_URL ||
      // Official Zhipu AI (BigModel) OpenAI-compatible endpoint
      "https://open.bigmodel.cn/api/paas/v4/";

    this.client = new OpenAI({ apiKey, baseURL });
  }

  /**
   * Check if the Z.ai service is properly configured
   */
  isConfigured() {
    return !!process.env[this.config.provider.apiKeyEnvVar];
  }

  /**
   * Generate a response using Z.ai (OpenAI-compatible chat)
   */
  async generateResponse(messages) {
    if (!this.client) {
      await this.initialize();
    }

    try {
      const formattedMessages = mapToOpenAIChat(messages);

      const doRequest = async (msgs) =>
        this.client.chat.completions.create({
          model: this.config.model.id,
          messages: msgs,
          max_tokens: this.config.model.maxTokens,
          temperature: this.config.model.temperature,
        });

      // First attempt: send as-is (with system role)
      let response;
      try {
        response = await doRequest(formattedMessages);
      } catch (primaryErr) {
        // Fallback: inline system prompt if provider rejects system role
        const inlined = inlineSystemIntoFirstUser(formattedMessages);
        response = await doRequest(inlined);
      }

      const content = response?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error(
          `Z.ai API returned an unexpected response format: ${JSON.stringify(
            response
          ).slice(0, 400)}`
        );
      }
      return content;
    } catch (error) {
      console.error(`Z.ai API Error: ${error.message}`);
      throw new Error(
        `Failed to generate response from Z.ai: ${error.message}. If you're using a gateway, set Z_BASE_URL (or ZAI_BASE_URL) to its OpenAI-compatible endpoint.`
      );
    }
  }
}


/**
 * ZaiService Service - TypeScript conversion
 */

import { BaseAIService } from "./BaseAIService.js";
import { mapToOpenAIChat } from "../utils/aiFormatting.js";
import OpenAI from "openai";
import dotenv from "dotenv";
import type { AIServiceConfig, Message } from "../types/index.js";

dotenv.config();

export class ZaiService extends BaseAIService {
  private client: OpenAI | null = null;

  constructor(config: AIServiceConfig) {
    super(config);
    this.name = "Zai";
  }

  async initialize(): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error("Zai API key is not configured");
    }

    this.client = new OpenAI({
      apiKey: process.env[this.config.provider.apiKeyEnvVar],
      baseURL: "https://api.zaiapp.ai/v1",
    });
  }

  isConfigured(): boolean {
    return !!process.env[this.config.provider.apiKeyEnvVar];
  }

  async generateResponse(messages: Message[]): Promise<string> {
    if (!this.client) {
      await this.initialize();
    }

    try {
      const formattedMessages = mapToOpenAIChat(messages);

      const response = await this.client!.chat.completions.create({
        model: this.config.model.id,
        messages: formattedMessages,
        max_tokens: this.config.model.maxTokens,
        temperature: this.config.model.temperature,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content in response");
      }

      return content;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`Zai API Error: ${errorMessage}`);
      throw new Error(`Failed to generate response: ${errorMessage}`);
    }
  }
}

/**
 * KimiService Service - TypeScript conversion
 */

import { BaseAIService } from "./BaseAIService.js";
import { mapToOpenAIChat } from "../utils/aiFormatting.js";
import OpenAI from "openai";
import dotenv from "dotenv";
import type { AIServiceConfig, Message, ServiceResponse, ServiceInitOptions } from "../types/index.js";

dotenv.config();

export class KimiService extends BaseAIService {
  private client: OpenAI | null = null;

  constructor(config: AIServiceConfig) {
    super(config);
    this.name = "Kimi";
  }

  async initialize(options?: ServiceInitOptions): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error("Kimi API key is not configured");
    }

    this.client = new OpenAI({
      apiKey: options?.apiKey || process.env[this.config.provider.apiKeyEnvVar],
      baseURL: options?.baseURL || "https://api.moonshot.cn/v1",
    });

    this.isInitialized = true;

    if (options?.validateOnInit) {
      await this.validateConfiguration();
    }
  }

  isConfigured(): boolean {
    return !!process.env[this.config.provider.apiKeyEnvVar];
  }

  async generateResponse(messages: Message[], context?: Record<string, unknown>): Promise<ServiceResponse> {
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

      return {
        content,
        usage: response.usage ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        } : undefined,
        model: response.model,
        finishReason: response.choices[0]?.finish_reason,
        rawResponse: response
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`Kimi API Error: ${errorMessage}`);
      throw new Error(`Failed to generate response: ${errorMessage}`);
    }
  }

  async validateConfiguration(): Promise<boolean> {
    try {
      if (!this.isConfigured()) {
        return false;
      }

      // Simple validation - try to create client
      if (!this.client) {
        await this.initialize();
      }

      return true;
    } catch (error) {
      console.error('Kimi configuration validation failed:', error);
      return false;
    }
  }
}

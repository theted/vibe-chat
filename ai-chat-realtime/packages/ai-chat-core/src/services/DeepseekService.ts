/**
 * Deepseek Service
 *
 * This service handles interactions with the Deepseek API.
 */

import { BaseAIService } from "./BaseAIService.js";
import { mapToOpenAIChat } from "../utils/aiFormatting.js";
import OpenAI from "openai";
import dotenv from "dotenv";
import type { AIServiceConfig, Message, ServiceResponse, ServiceInitOptions } from "../types/index.js";

dotenv.config();

export class DeepseekService extends BaseAIService {
  private client: OpenAI | null = null;

  constructor(config: AIServiceConfig) {
    super(config);
    this.name = "Deepseek";
  }

  /**
   * Initialize the Deepseek client
   */
  async initialize(options?: ServiceInitOptions): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error("Deepseek API key is not configured");
    }

    // Deepseek uses the OpenAI client with a different base URL
    this.client = new OpenAI({
      apiKey: options?.apiKey || process.env[this.config.provider.apiKeyEnvVar],
      baseURL: options?.baseURL || "https://api.deepseek.com/v1",
    });

    this.initialized = true;

    if (options?.validateOnInit) {
      await this.validateConfiguration();
    }
  }

  /**
   * Check if the Deepseek service is properly configured
   * @returns True if the API key is available
   */
  isConfigured(): boolean {
    return !!process.env[this.config.provider.apiKeyEnvVar];
  }

  /**
   * Generate a response using Deepseek
   * @param messages - Array of message objects with role and content
   * @param context - Optional context for the request
   * @returns The generated response
   */
  async generateResponse(messages: Message[], context?: Record<string, unknown>): Promise<ServiceResponse> {
    if (!this.client) {
      await this.initialize();
    }

    try {
      // Format messages for Deepseek API (OpenAI-compatible)
      const formattedMessages = mapToOpenAIChat(messages);

      const response = await this.client!.chat.completions.create({
        model: this.config.model.id,
        messages: formattedMessages,
        max_tokens: this.config.model.maxTokens,
        temperature: this.config.model.temperature,
      });

      // Get the response content
      let content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content in response");
      }

      // Limit response length to a maximum of 1000 characters
      // This prevents extremely long responses that can overwhelm the conversation
      const MAX_RESPONSE_LENGTH = 1000;
      if (content.length > MAX_RESPONSE_LENGTH) {
        // Truncate the content and add an ellipsis
        content = content.substring(0, MAX_RESPONSE_LENGTH) + "...";
        console.log(
          `Deepseek response truncated from ${response.choices[0]?.message?.content?.length} to ${MAX_RESPONSE_LENGTH} characters`
        );
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
      console.error(`Deepseek API Error: ${errorMessage}`);
      throw new Error(`Failed to generate response: ${errorMessage}`);
    }
  }

  async validateConfiguration(): Promise<boolean> {
    try {
      if (!this.isConfigured()) {
        return false;
      }

      if (!this.client) {
        await this.initialize();
      }

      return true;
    } catch (error) {
      console.error('Deepseek configuration validation failed:', error);
      return false;
    }
  }
}
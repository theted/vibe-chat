/**
 * QwenService Service - TypeScript conversion
 */

import { BaseAIService } from "./base/BaseAIService.js";
import { mapToOpenAIChat } from "../utils/aiFormatting.js";
import OpenAI from "openai";
import dotenv from "dotenv";
import type { AIServiceConfig, Message, ServiceResponse, ServiceInitOptions } from "../types/index.js";

dotenv.config();

export class QwenService extends BaseAIService {
  private client: OpenAI | null = null;

  constructor(config: AIServiceConfig) {
    super(config, "Qwen");
  }

  protected async performInitialization(_options?: ServiceInitOptions): Promise<void> {
    this.client = new OpenAI({
      apiKey: process.env[this.config.provider.apiKeyEnvVar],
      baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    });
  }

  protected async performGenerateResponse(messages: Message[]): Promise<ServiceResponse> {
    if (!this.client) {
      await this.performInitialization();
    }

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
      usage: {
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
        totalTokens: response.usage?.total_tokens,
      },
      model: this.config.model.id,
      finishReason: response.choices[0]?.finish_reason ?? undefined,
    };
  }
}

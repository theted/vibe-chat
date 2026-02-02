/**
 * Anthropic Service
 *
 * This service handles interactions with the Anthropic API.
 */

import { BaseAIService } from "./base/BaseAIService.js";
import Anthropic from "@anthropic-ai/sdk";
import type {
  Message,
  ServiceResponse,
  AnthropicServiceConfig,
  ServiceInitOptions,
} from "@/types/index.js";
import { ServiceError } from "@/types/services.js";
import { DEFAULT_MAX_TOKENS } from "@/config/aiProviders/constants.js";

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

export class AnthropicService extends BaseAIService {
  private client: Anthropic | null = null;

  constructor(config: AnthropicServiceConfig) {
    super(config, "Anthropic");
  }

  protected async performInitialization(
    _options?: ServiceInitOptions,
  ): Promise<void> {
    this.client = new Anthropic({
      apiKey: process.env[this.config.provider.apiKeyEnvVar],
    });
  }

  protected async performGenerateResponse(
    messages: Message[],
    _context?: Record<string, unknown>,
  ): Promise<ServiceResponse> {
    if (!this.client) {
      await this.performInitialization();
    }

    if (!this.client) {
      throw new ServiceError(
        "Anthropic client not initialized",
        "initialization",
        this.name,
      );
    }

    const systemMessage = messages.find((msg) => msg.role === "system");
    const systemPrompt = systemMessage?.content || this.getEnhancedSystemPrompt();

    const formattedMessages: AnthropicMessage[] = messages
      .filter((msg) => msg.role !== "system")
      .map((msg) => ({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content.trim(),
      }));

    const response = await this.client.messages.create({
      model: this.config.model.id,
      messages: formattedMessages,
      max_tokens: this.config.model.maxTokens || DEFAULT_MAX_TOKENS,
      temperature: this.config.model.temperature,
      system: systemPrompt,
    });

    if (!response?.content || !Array.isArray(response.content)) {
      throw new ServiceError(
        "Failed to parse Anthropic response: unexpected response structure",
        "response_parsing",
        this.name,
      );
    }

    const responseText = this.extractResponseText(response.content);
    const usage = {
      promptTokens: response.usage?.input_tokens || 0,
      completionTokens: response.usage?.output_tokens || 0,
      totalTokens:
        (response.usage?.input_tokens || 0) +
        (response.usage?.output_tokens || 0),
    };

    return {
      content: responseText,
      usage,
      model: this.config.model.id,
      finishReason: response.stop_reason || "completed",
    };
  }

  private extractResponseText(content: Anthropic.ContentBlock[]): string {
    if (content.length === 0) return "";

    const contentItem = content[0];
    if (contentItem.type === "text") {
      return contentItem.text;
    }
    return "";
  }

  protected async performHealthCheck(): Promise<boolean> {
    if (!this.client) {
      await this.performInitialization();
    }

    const payload = {
      model: this.config.model.id,
      messages: [{ role: "user" as const, content: "Hi" }],
      max_tokens: this.config.model.maxTokens || DEFAULT_MAX_TOKENS,
      temperature: this.config.model.temperature,
      system: this.getEnhancedSystemPrompt(),
    };
    const url = "https://api.anthropic.com/v1/messages";
    this.logHealthCheckDetails("request", { url, payload });

    const response = await this.client?.messages.create(payload);
    this.logHealthCheckDetails("response", { url, response });

    return Array.isArray(response?.content);
  }

  protected async performShutdown(): Promise<void> {
    this.client = null;
  }

  protected async performConnectionReset(): Promise<void> {
    this.client = null;
    await this.performInitialization();
  }
}

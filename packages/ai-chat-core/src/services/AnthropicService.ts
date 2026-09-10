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

    const mapped = messages
      .filter((msg) => msg.role !== "system")
      .map((msg) => ({
        role: (msg.role === "user" ? "user" : "assistant") as
          | "user"
          | "assistant",
        content: msg.content.trim(),
        sender: (msg as any).sender || (msg as any).displayName,
      }));

    // Anthropic API requires alternating user/assistant roles and the
    // conversation must end with a user message (no assistant prefill).
    // In multi-AI chats, consecutive AI messages produce consecutive
    // assistant entries, and the last message is often from an AI.
    // Merge consecutive same-role messages and ensure a trailing user turn.
    const formattedMessages: AnthropicMessage[] = [];
    for (const msg of mapped) {
      const last = formattedMessages[formattedMessages.length - 1];
      if (last && last.role === msg.role) {
        const prefix = msg.sender ? `[${msg.sender}] ` : "";
        last.content += `\n\n${prefix}${msg.content}`;
      } else {
        const prefix = msg.role === "assistant" && msg.sender ? `[${msg.sender}] ` : "";
        formattedMessages.push({
          role: msg.role,
          content: `${prefix}${msg.content}`,
        });
      }
    }

    // Ensure conversation ends with a user message
    if (
      formattedMessages.length === 0 ||
      formattedMessages[formattedMessages.length - 1].role === "assistant"
    ) {
      formattedMessages.push({
        role: "user",
        content: "Continue the conversation.",
      });
    }

    const response = await this.client.messages.create({
      model: this.config.model.id,
      messages: formattedMessages,
      max_tokens: this.config.model.maxTokens || DEFAULT_MAX_TOKENS,
      ...this.samplingParams(),
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

  /**
   * Claude 5-era models reject temperature/top_p/top_k outright (HTTP 400)
   * rather than clamping them, so the parameter is only sent when a model
   * explicitly opts in by declaring one.
   */
  private samplingParams(): { temperature?: number } {
    const { temperature } = this.config.model;
    return temperature === undefined ? {} : { temperature };
  }

  /**
   * Models with extended thinking enabled return thinking blocks ahead of the
   * answer, so the first block is not necessarily the reply. Concatenate every
   * text block instead of assuming content[0].
   */
  private extractResponseText(content: Anthropic.ContentBlock[]): string {
    return content
      .filter(
        (block): block is Extract<Anthropic.ContentBlock, { type: "text" }> =>
          block.type === "text",
      )
      .map((block) => block.text)
      .join("")
      .trim();
  }

  protected async performHealthCheck(): Promise<boolean> {
    if (!this.client) {
      await this.performInitialization();
    }

    const payload = {
      model: this.config.model.id,
      messages: [{ role: "user" as const, content: "Hi" }],
      max_tokens: this.config.model.maxTokens || DEFAULT_MAX_TOKENS,
      ...this.samplingParams(),
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

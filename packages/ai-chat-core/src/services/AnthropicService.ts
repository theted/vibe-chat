/**
 * Anthropic Service
 *
 * This service handles interactions with the Anthropic API.
 */

import { BaseAIService } from "./base/BaseAIService.js";
import Anthropic from "@anthropic-ai/sdk";
import { Message, ServiceResponse, AnthropicServiceConfig, ServiceInitOptions } from "@/types/index.js";
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

  /**
   * Initialize the Anthropic client
   */
  protected async performInitialization(_options?: ServiceInitOptions): Promise<void> {
    this.client = new Anthropic({
      apiKey: process.env[this.config.provider.apiKeyEnvVar],
    });
  }

  /**
   * Generate a response using Anthropic
   */
  protected async performGenerateResponse(messages: Message[], _context?: Record<string, unknown>): Promise<ServiceResponse> {
    if (!this.client) {
      await this.performInitialization();
    }

    if (!this.client) {
      throw new ServiceError("Anthropic client not initialized", "initialization", this.name);
    }

    // Extract system message if present
    let systemPrompt = this.getEnhancedSystemPrompt();
    let formattedMessages: AnthropicMessage[] = [];

    // Find and extract system message
    const systemMessageIndex = messages.findIndex(
      (msg) => msg.role === "system"
    );

    if (systemMessageIndex !== -1) {
      systemPrompt = messages[systemMessageIndex].content;
      // Remove system message from the array
      formattedMessages = messages
        .filter((_, index) => index !== systemMessageIndex)
        .map((msg) => ({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.content.trim(),
        }));
    } else {
      // No system message found, use default formatting
      formattedMessages = messages
        .filter((msg) => msg.role !== "system")
        .map((msg) => ({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.content.trim(),
        }));
    }

    const response = await this.client.messages.create({
      model: this.config.model.id,
      messages: formattedMessages,
      max_tokens: this.config.model.maxTokens || DEFAULT_MAX_TOKENS,
      temperature: this.config.model.temperature,
      system: systemPrompt,
    });

    // Handle the response structure properly
    if (response?.content && Array.isArray(response.content)) {
      // Handle empty content array
      if (response.content.length === 0) {
        return {
          content: "",
          usage: {
            promptTokens: response.usage?.input_tokens || 0,
            completionTokens: response.usage?.output_tokens || 0,
            totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
          },
          model: this.config.model.id,
          finishReason: response.stop_reason || "completed"
        };
      }

      const contentItem = response.content[0];
      let responseText = "";

      // Check for different possible structures
      if (contentItem.type === "text" && "text" in contentItem) {
        responseText = contentItem.text as string;
      } else if ("text" in contentItem) {
        responseText = (contentItem as any).text;
      } else if ("value" in contentItem) {
        responseText = (contentItem as any).value;
      }

      return {
        content: responseText,
        usage: {
          promptTokens: response.usage?.input_tokens || 0,
          completionTokens: response.usage?.output_tokens || 0,
          totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
        },
        model: this.config.model.id,
        finishReason: response.stop_reason || "completed"
      };
    }

    throw new ServiceError(
      "Failed to parse Anthropic response: unexpected response structure",
      "response_parsing",
      this.name
    );
  }

  /**
   * Health check for the Anthropic service
   */
  protected async performHealthCheck(): Promise<boolean> {
    if (!this.client) {
      await this.performInitialization();
    }
    // Simple test call with minimal tokens
    const testMessages: Message[] = [{ role: "user", content: "Hi" }];
    const payload = {
      model: this.config.model.id,
      messages: testMessages.map((message) => ({
        role: (message.role === "user" ? "user" : "assistant") as "user" | "assistant",
        content: message.content.trim(),
      })),
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

  /**
   * Shutdown the service
   */
  protected async performShutdown(): Promise<void> {
    this.client = null;
  }

  /**
   * Reset the connection
   */
  protected async performConnectionReset(): Promise<void> {
    this.client = null;
    await this.performInitialization();
  }
}

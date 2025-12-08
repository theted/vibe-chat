/**
 * Anthropic Service
 *
 * This service handles interactions with the Anthropic API.
 */

import { BaseAIService } from "./BaseAIService.js";
import Anthropic from "@anthropic-ai/sdk";
import { Message, ServiceResponse, AnthropicServiceConfig, ServiceInitOptions } from "../types/index.js";
import { ServiceError } from "../types/services.js";

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

export class AnthropicService extends BaseAIService {
  private client: Anthropic | null = null;
  private lastInitTime?: number;

  constructor(config: AnthropicServiceConfig) {
    super(config);
    this.name = "Anthropic";
  }

  /**
   * Initialize the Anthropic client
   */
  async initialize(options?: ServiceInitOptions): Promise<void> {
    if (!this.isConfigured()) {
      throw new ServiceError("Anthropic API key is not configured", "configuration", this.name);
    }

    this.client = new Anthropic({
      apiKey: options?.apiKey || process.env[this.config.provider.apiKeyEnvVar],
    });

    this.isInitialized = true;
    this.lastInitTime = Date.now();

    if (options?.validateOnInit) {
      await this.validateConfiguration();
    }
  }

  /**
   * Check if the Anthropic service is properly configured
   */
  isConfigured(): boolean {
    return !!process.env[this.config.provider.apiKeyEnvVar];
  }

  /**
   * Generate a response using Anthropic
   */
  async generateResponse(messages: Message[], context?: Record<string, unknown>): Promise<ServiceResponse> {
    if (!this.client) {
      await this.initialize();
    }

    if (!this.client) {
      throw new ServiceError("Anthropic client not initialized", "initialization", this.name);
    }

    try {
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
            content: msg.content.trim(), // Trim whitespace to avoid API errors
          }));
      } else {
        // No system message found, use default formatting
        formattedMessages = messages
          .filter((msg) => msg.role !== "system")
          .map((msg) => ({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.content.trim(), // Trim whitespace to avoid API errors
          }));
      }

      const response = await this.client.messages.create({
        model: this.config.model.id,
        messages: formattedMessages,
        max_tokens: this.config.model.maxTokens || 1000,
        temperature: this.config.model.temperature,
        system: systemPrompt,
      });

      // Handle the response structure properly
      if (response && response.content && Array.isArray(response.content)) {
        // Handle empty content array (valid response, model chose not to generate text)
        if (response.content.length === 0) {
          console.warn(
            "Anthropic returned empty content array. Stop reason:",
            response.stop_reason
          );
          return {
            content: "", // Model completed but had nothing to say
            usage: {
              promptTokens: response.usage?.input_tokens || 0,
              completionTokens: response.usage?.output_tokens || 0,
              totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
            },
            model: this.config.model.id,
            finishReason: response.stop_reason || 'completed'
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
          finishReason: response.stop_reason || 'completed'
        };
      }

      // If we reach here, response structure is truly unexpected
      console.error(
        "Unexpected Anthropic response structure:",
        JSON.stringify(response, null, 2)
      );
      throw new ServiceError(
        "Failed to parse Anthropic response: unexpected response structure",
        "response_parsing",
        this.name
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Anthropic API Error: ${errorMessage}`);

      if (error instanceof ServiceError) {
        throw error;
      }

      throw new ServiceError(
        `Failed to generate response: ${errorMessage}`,
        "api_error",
        this.name,
        { originalError: error }
      );
    }
  }

  /**
   * Health check for the Anthropic service
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.isConfigured()) {
        return false;
      }

      if (!this.client) {
        await this.initialize();
      }

      // Simple test call with minimal tokens
      const testMessages = [{ role: "user" as const, content: "Hi" }];
      await this.generateResponse(testMessages);
      return true;
    } catch (error) {
      console.warn(`Anthropic health check failed: ${error}`);
      return false;
    }
  }

  /**
   * Reset the connection (reinitialize client)
   */
  async resetConnection(): Promise<void> {
    this.client = null;
    this.isInitialized = false;
    await this.initialize();
  }

  /**
   * Get service-specific information
   */
  getServiceInfo(): Record<string, unknown> {
    return {
      name: this.name,
      provider: "Anthropic",
      supportedFeatures: [
        "chat",
        "system_prompts",
        "streaming",
        "function_calling"
      ],
      apiKeyConfigured: this.isConfigured(),
      clientInitialized: !!this.client,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Validate configuration
   */
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
      console.error('Anthropic configuration validation failed:', error);
      return false;
    }
  }

  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    this.client = null;
    this.isInitialized = false;
  }
}
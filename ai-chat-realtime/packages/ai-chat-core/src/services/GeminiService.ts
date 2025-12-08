/**
 * Gemini Service
 *
 * This service handles interactions with the Google Gemini AI API.
 */

import { BaseAIService } from "./base/BaseAIService.js";
import { toGeminiHistory } from "../utils/aiFormatting.js";
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { Message, AIResponse, GeminiServiceConfig } from "../types/index.js";
import { ServiceError } from "../types/services.js";

export class GeminiService extends BaseAIService<GeminiServiceConfig> {
  private client: GoogleGenerativeAI | null = null;
  private model: GenerativeModel | null = null;

  constructor(config: GeminiServiceConfig) {
    super(config);
    this.name = "Gemini";
  }

  /**
   * Initialize the Gemini client
   */
  async initialize(): Promise<void> {
    if (!this.isConfigured()) {
      throw new ServiceError("Google AI API key is not configured", "configuration", this.name);
    }

    this.client = new GoogleGenerativeAI(
      process.env[this.config.provider.apiKeyEnvVar]!
    );

    this.model = this.client.getGenerativeModel({
      model: this.config.model.id,
      // Use system instructions to set the model behavior consistently
      systemInstruction: this.getEnhancedSystemPrompt(),
    });

    this.isInitialized = true;
    this.lastInitTime = Date.now();
  }

  /**
   * Check if the Gemini service is properly configured
   */
  isConfigured(): boolean {
    return !!process.env[this.config.provider.apiKeyEnvVar];
  }

  /**
   * Generate a response using Gemini
   */
  async generateResponse(messages: Message[]): Promise<AIResponse> {
    if (!this.client || !this.model) {
      await this.initialize();
    }

    if (!this.client || !this.model) {
      throw new ServiceError("Gemini client not initialized", "initialization", this.name);
    }

    try {
      // Convert the conversation into Gemini history (skip system messages)
      const nonSystem = messages.filter((m) => m.role !== "system");

      // Find the last user message to send as the live input
      const lastUserIndex = [...nonSystem]
        .reverse()
        .findIndex((m) => m.role === "user");

      if (lastUserIndex === -1) {
        throw new ServiceError("No user message found to send to Gemini", "invalid_input", this.name);
      }

      const actualLastUserIndex = nonSystem.length - 1 - lastUserIndex;
      const historyMessages = nonSystem.slice(0, actualLastUserIndex);
      const lastUserMessage = nonSystem[actualLastUserIndex].content;

      const history = toGeminiHistory(historyMessages);

      // Create a chat with proper history
      const chat = this.model.startChat({
        generationConfig: {
          maxOutputTokens: this.config.model.maxTokens,
          temperature: this.config.model.temperature,
        },
        history,
      });

      // Send the final user message and stream the response
      const result = await chat.sendMessageStream(lastUserMessage);

      // Collect the response
      let responseText = "";
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        responseText += chunkText;
      }

      // Limit response length to approximately 3-6 sentences
      const sentences = responseText.split(/[.!?]+\s+/);
      if (sentences.length > 6) {
        responseText = sentences.slice(0, 6).join(". ") + ".";
      }

      // Get final response for usage info
      const finalResult = await result.response;
      const usageMetadata = finalResult.usageMetadata;

      return {
        content: responseText,
        usage: {
          promptTokens: usageMetadata?.promptTokenCount || 0,
          completionTokens: usageMetadata?.candidatesTokenCount || 0,
          totalTokens: usageMetadata?.totalTokenCount || 0
        },
        model: this.config.model.id,
        finishReason: finalResult.candidates?.[0]?.finishReason || 'completed'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Gemini API Error: ${errorMessage}`);

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
   * Health check for the Gemini service
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.isConfigured()) {
        return false;
      }

      if (!this.client || !this.model) {
        await this.initialize();
      }

      // Simple test call with minimal tokens
      const testMessages = [{ role: "user" as const, content: "Hi" }];
      await this.generateResponse(testMessages);
      return true;
    } catch (error) {
      console.warn(`Gemini health check failed: ${error}`);
      return false;
    }
  }

  /**
   * Reset the connection (reinitialize client)
   */
  async resetConnection(): Promise<void> {
    this.client = null;
    this.model = null;
    this.isInitialized = false;
    await this.initialize();
  }

  /**
   * Get service-specific information
   */
  getServiceInfo(): Record<string, unknown> {
    return {
      ...super.getServiceInfo(),
      provider: "Google",
      supportedFeatures: [
        "chat",
        "system_instructions",
        "streaming",
        "multimodal"
      ],
      apiKeyConfigured: this.isConfigured(),
      clientInitialized: !!this.client,
      modelInitialized: !!this.model
    };
  }

  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    this.client = null;
    this.model = null;
    this.isInitialized = false;
  }
}
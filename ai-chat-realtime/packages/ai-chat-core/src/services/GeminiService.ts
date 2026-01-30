/**
 * Gemini Service
 *
 * This service handles interactions with the Google Gemini AI API.
 */

import { BaseAIService } from "./base/BaseAIService.js";
import { toGeminiHistory } from "../utils/aiFormatting.js";
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { Message, ServiceResponse, GeminiServiceConfig, ServiceInitOptions } from "../types/index.js";
import { ServiceError } from "../types/services.js";

export class GeminiService extends BaseAIService {
  private client: GoogleGenerativeAI | null = null;
  private geminiModel: GenerativeModel | null = null;

  constructor(config: GeminiServiceConfig) {
    super(config, "Gemini");
  }

  /**
   * Initialize the Gemini client
   */
  protected async performInitialization(_options?: ServiceInitOptions): Promise<void> {
    this.client = new GoogleGenerativeAI(
      process.env[this.config.provider.apiKeyEnvVar]!
    );

    this.geminiModel = this.client.getGenerativeModel({
      model: this.config.model.id,
      systemInstruction: this.getEnhancedSystemPrompt(),
    });
  }

  /**
   * Generate a response using Gemini
   */
  protected async performGenerateResponse(messages: Message[]): Promise<ServiceResponse> {
    if (!this.client || !this.geminiModel) {
      await this.performInitialization();
    }

    if (!this.client || !this.geminiModel) {
      throw new ServiceError("Gemini client not initialized", "initialization", this.name);
    }

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
    const chat = this.geminiModel.startChat({
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
        promptTokens: usageMetadata?.promptTokenCount,
        completionTokens: usageMetadata?.candidatesTokenCount,
        totalTokens: usageMetadata?.totalTokenCount
      },
      model: this.config.model.id,
      finishReason: finalResult.candidates?.[0]?.finishReason ?? 'completed'
    };
  }

  /**
   * Health check for the Gemini service
   */
  protected async performHealthCheck(): Promise<boolean> {
    try {
      if (!this.client || !this.geminiModel) {
        await this.performInitialization();
      }

      // Simple test call with minimal tokens
      const testMessages: Message[] = [{ role: "user", content: "Hi" }];
      const history = toGeminiHistory([]);
      const lastUserMessage = testMessages[0].content;
      const generationConfig = {
        maxOutputTokens: this.config.model.maxTokens,
        temperature: this.config.model.temperature,
      };
      const payload = {
        model: this.config.model.id,
        message: lastUserMessage,
        history,
        generationConfig,
      };
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model.id}:streamGenerateContent`;
      this.logHealthCheckDetails("request", { url, payload });

      const chat = this.geminiModel?.startChat({
        generationConfig,
        history,
      });
      const result = await chat?.sendMessageStream(lastUserMessage);
      const response = await result?.response;
      this.logHealthCheckDetails("response", { url, response });
      return true;
    } catch (error) {
      console.warn(`Gemini health check failed: ${error}`);
      return false;
    }
  }

  /**
   * Reset the connection (reinitialize client)
   */
  protected async performConnectionReset(): Promise<void> {
    this.client = null;
    this.geminiModel = null;
    await this.performInitialization();
  }

  /**
   * Shutdown the service
   */
  protected async performShutdown(): Promise<void> {
    this.client = null;
    this.geminiModel = null;
  }
}

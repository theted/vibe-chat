/**
 * Gemini Service
 *
 * This service handles interactions with the Google Gemini AI API.
 */

import { BaseAIService } from "./base/BaseAIService.js";
import { toGeminiHistory } from "@/utils/aiFormatting.js";
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import type {
  Message,
  ServiceResponse,
  GeminiServiceConfig,
  ServiceInitOptions,
} from "@/types/index.js";
import { ServiceError } from "@/types/services.js";

export class GeminiService extends BaseAIService {
  private client: GoogleGenerativeAI | null = null;
  private geminiModel: GenerativeModel | null = null;

  constructor(config: GeminiServiceConfig) {
    super(config, "Gemini");
  }

  protected async performInitialization(
    _options?: ServiceInitOptions,
  ): Promise<void> {
    this.client = new GoogleGenerativeAI(
      process.env[this.config.provider.apiKeyEnvVar]!,
    );

    this.geminiModel = this.client.getGenerativeModel({
      model: this.config.model.id,
      systemInstruction: this.getEnhancedSystemPrompt(),
    });
  }

  protected async performGenerateResponse(
    messages: Message[],
  ): Promise<ServiceResponse> {
    if (!this.client || !this.geminiModel) {
      await this.performInitialization();
    }

    if (!this.client || !this.geminiModel) {
      throw new ServiceError(
        "Gemini client not initialized",
        "initialization",
        this.name,
      );
    }

    const nonSystem = messages.filter((m) => m.role !== "system");
    const lastUserIndex = [...nonSystem]
      .reverse()
      .findIndex((m) => m.role === "user");

    if (lastUserIndex === -1) {
      throw new ServiceError(
        "No user message found to send to Gemini",
        "invalid_input",
        this.name,
      );
    }

    const actualLastUserIndex = nonSystem.length - 1 - lastUserIndex;
    const historyMessages = nonSystem.slice(0, actualLastUserIndex);
    const lastUserMessage = nonSystem[actualLastUserIndex].content;
    const history = toGeminiHistory(historyMessages);

    const chat = this.geminiModel.startChat({
      generationConfig: {
        maxOutputTokens: this.config.model.maxTokens,
        temperature: this.config.model.temperature,
      },
      history,
    });

    const result = await chat.sendMessageStream(lastUserMessage);

    let responseText = "";
    for await (const chunk of result.stream) {
      responseText += chunk.text();
    }

    const finalResult = await result.response;
    const usageMetadata = finalResult.usageMetadata;

    return {
      content: responseText,
      usage: {
        promptTokens: usageMetadata?.promptTokenCount,
        completionTokens: usageMetadata?.candidatesTokenCount,
        totalTokens: usageMetadata?.totalTokenCount,
      },
      model: this.config.model.id,
      finishReason: finalResult.candidates?.[0]?.finishReason ?? "completed",
    };
  }

  protected async performHealthCheck(): Promise<boolean> {
    try {
      if (!this.client || !this.geminiModel) {
        await this.performInitialization();
      }

      const history = toGeminiHistory([]);
      const generationConfig = {
        maxOutputTokens: this.config.model.maxTokens,
        temperature: this.config.model.temperature,
      };
      const payload = {
        model: this.config.model.id,
        message: "Hi",
        history,
        generationConfig,
      };
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model.id}:streamGenerateContent`;
      this.logHealthCheckDetails("request", { url, payload });

      const chat = this.geminiModel?.startChat({ generationConfig, history });
      const result = await chat?.sendMessageStream("Hi");
      const response = await result?.response;
      this.logHealthCheckDetails("response", { url, response });

      return true;
    } catch (error) {
      console.warn(`Gemini health check failed: ${error}`);
      return false;
    }
  }

  protected async performConnectionReset(): Promise<void> {
    this.client = null;
    this.geminiModel = null;
    await this.performInitialization();
  }

  protected async performShutdown(): Promise<void> {
    this.client = null;
    this.geminiModel = null;
  }
}

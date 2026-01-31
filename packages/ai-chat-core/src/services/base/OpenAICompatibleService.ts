/**
 * OpenAI-Compatible Service Base Class
 *
 * This class provides a base implementation for services that use the OpenAI API format.
 * It includes common initialization, message formatting, and request logic that can be
 * shared across multiple providers (OpenAI, Mistral, Deepseek, Grok, etc.).
 */

import { BaseAIService } from "./BaseAIService.js";
import { mapToOpenAIChat } from "@/utils/aiFormatting.js";
import {
  buildResponsesPayload,
  ensureResponsesClient,
  extractTextFromResponses,
} from "./openaiResponses.js";
import {
  OpenAICompatibleServiceConfig,
  OpenAIClient,
  OpenAICompletionRequest,
  OpenAICompletionResponse,
  ServiceAPIError,
  ServiceTimeoutError,
} from "@/types/services.js";
import {
  Message,
  ServiceResponse,
  ServiceInitOptions,
  AIServiceConfig,
  OpenAIMessage,
} from "@/types/index.js";

export abstract class OpenAICompatibleService extends BaseAIService {
  protected client: OpenAIClient | null = null;
  protected baseURL?: string;
  protected defaultHeaders?: Record<string, string>;

  constructor(config: AIServiceConfig, name: string) {
    super(config, name);
  }

  /**
   * Get the base URL for the API endpoint
   * Can be overridden by subclasses for custom endpoints
   */
  protected getBaseURL(): string | undefined {
    return (this.config as OpenAICompatibleServiceConfig).baseURL;
  }

  /**
   * Get default headers for API requests
   * Can be overridden by subclasses for custom headers
   */
  protected getDefaultHeaders(): Record<string, string> {
    return (this.config as OpenAICompatibleServiceConfig).defaultHeaders || {};
  }

  /**
   * Create the OpenAI-compatible client
   * Must be implemented by subclasses with provider-specific client creation
   */
  protected abstract createClient(
    apiKey: string,
    options?: ServiceInitOptions,
  ): OpenAIClient;

  /**
   * Service-specific initialization logic
   */
  protected async performInitialization(
    options?: ServiceInitOptions,
  ): Promise<void> {
    const apiKey = process.env[this.config.provider.apiKeyEnvVar];
    if (!apiKey) {
      throw new Error(
        `${this.config.provider.apiKeyEnvVar} environment variable is not set`,
      );
    }

    this.baseURL = this.getBaseURL();
    this.defaultHeaders = this.getDefaultHeaders();
    if (this.usesResponsesAPI()) {
      this.defaultHeaders = {
        ...this.defaultHeaders,
        "OpenAI-Beta": this.defaultHeaders?.["OpenAI-Beta"] || "assistants=v2",
      };
    }

    this.client = this.createClient(apiKey, options);

    // Log successful initialization
    this.logger?.info("Service initialized", {
      service: this.name,
      model: this.getModel(),
      baseURL: this.baseURL,
    });
  }

  /**
   * Format messages for OpenAI-compatible API
   */
  protected formatMessages(messages: Message[]): OpenAIMessage[] {
    return mapToOpenAIChat(messages);
  }

  /**
   * Prepare the request parameters for the API call
   * Can be overridden by subclasses for custom parameters
   */
  protected prepareRequestParams(
    formattedMessages: OpenAIMessage[],
    context?: Record<string, unknown>,
  ): OpenAICompletionRequest {
    const baseParams: OpenAICompletionRequest = {
      model: this.getModel(),
      messages: formattedMessages,
      temperature: this.config.model.temperature || 0.7,
      max_tokens: this.config.model.maxTokens || 4000,
    };

    // Apply any context-specific parameters
    if (context?.temperature !== undefined) {
      baseParams.temperature = Number(context.temperature);
    }

    if (context?.maxTokens !== undefined) {
      baseParams.max_tokens = Number(context.maxTokens);
    }

    return baseParams;
  }

  /**
   * Process messages for service-specific requirements
   * Can be overridden by subclasses for custom message processing
   */
  protected processMessages(messages: OpenAIMessage[]): OpenAIMessage[] {
    // Default implementation - no processing needed
    return messages;
  }

  protected usesResponsesAPI(): boolean {
    return Boolean(
      (this.config.model as { useResponsesApi?: boolean }).useResponsesApi,
    );
  }

  protected async makeResponsesAPIRequest(
    messages: OpenAIMessage[],
    context?: Record<string, unknown>,
  ): Promise<ServiceResponse> {
    const client = ensureResponsesClient(this.client, this.name);

    const temperatureRaw =
      context?.temperature ?? this.config.model.temperature ?? 0.7;
    const temperature =
      typeof temperatureRaw === "number"
        ? temperatureRaw
        : Number(temperatureRaw);
    const maxTokensRaw = context?.maxTokens ?? this.config.model.maxTokens;
    const maxTokens =
      typeof maxTokensRaw === "number"
        ? maxTokensRaw
        : typeof maxTokensRaw === "string"
          ? Number(maxTokensRaw)
          : undefined;
    const reasoningEffort = (
      context as { reasoningEffort?: string } | undefined
    )?.reasoningEffort;
    const payload = buildResponsesPayload({
      model: this.getModel(),
      messages,
      temperature,
      maxTokens,
      reasoningEffort,
    });

    const response = await (client as any).responses.create(payload);
    const content = extractTextFromResponses(response, this.name);

    return {
      content,
      model: response?.model || this.getModel(),
      rawResponse: response,
    };
  }

  /**
   * Make the API request to the OpenAI-compatible endpoint
   */
  protected async makeAPIRequest(
    params: OpenAICompletionRequest,
  ): Promise<OpenAICompletionResponse> {
    if (!this.client) {
      throw new ServiceAPIError(
        "Client not initialized. Call initialize() first.",
        this.name,
      );
    }

    try {
      const timeoutMs = this.config.timeout || 30000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await Promise.race([
        this.client.chat.completions.create(params),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener("abort", () => {
            reject(
              new ServiceTimeoutError(
                `Request timed out after ${timeoutMs}ms`,
                this.name,
                timeoutMs,
              ),
            );
          });
        }),
      ]);

      clearTimeout(timeoutId);
      return response as OpenAICompletionResponse;
    } catch (error) {
      if (error instanceof ServiceTimeoutError) {
        throw error;
      }

      // Handle different types of errors
      if (error && typeof error === "object" && "status" in error) {
        const statusCode = (error as { status: number }).status;
        throw new ServiceAPIError(
          `API request failed with status ${statusCode}`,
          this.name,
          statusCode,
          error,
        );
      }

      throw new ServiceAPIError(
        `API request failed: ${error instanceof Error ? error.message : String(error)}`,
        this.name,
        undefined,
        error,
      );
    }
  }

  /**
   * Parse the API response and extract the content
   */
  protected parseResponse(
    apiResponse: OpenAICompletionResponse,
  ): ServiceResponse {
    const choice = apiResponse.choices[0];
    if (!choice?.message?.content) {
      throw new ServiceAPIError(
        "Invalid API response: missing content",
        this.name,
        undefined,
        apiResponse,
      );
    }

    return {
      content: choice.message.content.trim(),
      usage: apiResponse.usage
        ? {
            promptTokens: apiResponse.usage.prompt_tokens,
            completionTokens: apiResponse.usage.completion_tokens,
            totalTokens: apiResponse.usage.total_tokens,
          }
        : undefined,
      model: apiResponse.model,
      finishReason: choice.finish_reason,
      rawResponse: apiResponse,
    };
  }

  /**
   * Resolve the API URL for health check logging.
   */
  protected getHealthCheckURL(path: string): string {
    const baseURL = this.baseURL || "https://api.openai.com/v1";
    return `${baseURL.replace(/\/$/, "")}${path}`;
  }

  /**
   * Generate response implementation for OpenAI-compatible services
   */
  protected async performGenerateResponse(
    messages: Message[],
    context?: Record<string, unknown>,
  ): Promise<ServiceResponse> {
    // Format messages for API
    const formattedMessages = this.formatMessages(messages);

    // Process messages for service-specific requirements
    const processedMessages = this.processMessages(formattedMessages);

    if (this.usesResponsesAPI()) {
      return this.makeResponsesAPIRequest(processedMessages, context);
    }

    const requestParams = this.prepareRequestParams(processedMessages, context);
    const apiResponse = await this.makeAPIRequest(requestParams);
    return this.parseResponse(apiResponse);
  }

  /**
   * Health check for OpenAI-compatible services
   */
  protected async performHealthCheck(): Promise<boolean> {
    try {
      if (!this.client) {
        return false;
      }

      // Make a minimal API call to test connectivity
      const testMessage: Message = {
        role: "user",
        content: "ping",
      };

      const formattedMessages = this.formatMessages([testMessage]);
      const processedMessages = this.processMessages(formattedMessages);

      if (this.usesResponsesAPI()) {
        const payload = buildResponsesPayload({
          model: this.getModel(),
          messages: processedMessages,
          temperature: this.config.model.temperature ?? 0.7,
          maxTokens: this.config.model.maxTokens,
        });

        const url = this.getHealthCheckURL("/responses");
        this.logHealthCheckDetails("request", { url, payload });
        const client = ensureResponsesClient(this.client, this.name);
        const response = await (client as any).responses.create(payload);
        this.logHealthCheckDetails("response", { url, response });

        const content = extractTextFromResponses(response, this.name);
        return content.length > 0;
      }

      const requestParams = this.prepareRequestParams(processedMessages);
      const url = this.getHealthCheckURL("/chat/completions");
      this.logHealthCheckDetails("request", { url, payload: requestParams });
      const apiResponse = await this.makeAPIRequest(requestParams);
      this.logHealthCheckDetails("response", { url, response: apiResponse });
      const response = this.parseResponse(apiResponse);
      return response.content.length > 0;
    } catch (error) {
      const errorMessage = this.extractAPIErrorMessage(error);
      this.lastValidationError = `Health check failed: ${errorMessage}`;
      this.logger?.debug("Health check failed", {
        service: this.name,
        error: errorMessage,
      });
      return false;
    }
  }

  /**
   * Extract meaningful error message from API errors
   */
  protected extractAPIErrorMessage(error: unknown): string {
    if (!error) return 'Unknown error';

    // Handle OpenAI SDK error format
    if (error && typeof error === 'object') {
      const err = error as Record<string, unknown>;

      // Check for error.error.message (OpenAI format)
      if (err.error && typeof err.error === 'object') {
        const innerError = err.error as Record<string, unknown>;
        if (innerError.message) return String(innerError.message);
      }

      // Check for error.message
      if (err.message) return String(err.message);

      // Check for status code and body
      if (err.status && err.body) {
        const body = err.body as Record<string, unknown>;
        const bodyMessage = body?.message || body?.error;
        return bodyMessage
          ? `HTTP ${err.status}: ${bodyMessage}`
          : `HTTP ${err.status}`;
      }

      // Check for response data
      if (err.response && typeof err.response === 'object') {
        const resp = err.response as Record<string, unknown>;
        if (resp.data && typeof resp.data === 'object') {
          const data = resp.data as Record<string, unknown>;
          if (data.message) return String(data.message);
          if (data.error) return String(data.error);
        }
      }
    }

    if (error instanceof Error) return error.message;
    return String(error);
  }

  /**
   * Service-specific shutdown logic
   */
  protected async performShutdown(): Promise<void> {
    this.client = null;
    this.logger?.info("Service shut down", { service: this.name });
  }

  /**
   * Reset connection by reinitializing the client
   */
  protected async performConnectionReset(): Promise<void> {
    this.client = null;
    await this.performInitialization();
    this.logger?.info("Connection reset", { service: this.name });
  }

  /**
   * Get service-specific metadata
   */
  getMetadata(): Record<string, unknown> {
    return {
      ...super.getMetadata(),
      baseURL: this.baseURL,
      hasClient: !!this.client,
      supportsStreaming:
        (this.config as OpenAICompatibleServiceConfig).supportsStreaming ??
        true,
    };
  }
}

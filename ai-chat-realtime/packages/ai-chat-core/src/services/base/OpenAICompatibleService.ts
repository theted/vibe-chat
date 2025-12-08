/**
 * OpenAI-Compatible Service Base Class
 *
 * This class provides a base implementation for services that use the OpenAI API format.
 * It includes common initialization, message formatting, and request logic that can be
 * shared across multiple providers (OpenAI, Mistral, Deepseek, Grok, etc.).
 */

import { BaseAIService } from './BaseAIService.js';
import { mapToOpenAIChat } from '../../utils/aiFormatting.js';
import {
  OpenAICompatibleServiceConfig,
  OpenAIClient,
  OpenAICompletionRequest,
  OpenAICompletionResponse,
  ServiceAPIError,
  ServiceTimeoutError
} from '../../types/services.js';
import {
  Message,
  ServiceResponse,
  ServiceInitOptions,
  AIServiceConfig,
  OpenAIMessage
} from '../../types/index.js';

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
  protected abstract createClient(apiKey: string, options?: ServiceInitOptions): OpenAIClient;

  /**
   * Service-specific initialization logic
   */
  protected async performInitialization(options?: ServiceInitOptions): Promise<void> {
    const apiKey = process.env[this.config.provider.apiKeyEnvVar];
    if (!apiKey) {
      throw new Error(`${this.config.provider.apiKeyEnvVar} environment variable is not set`);
    }

    this.baseURL = this.getBaseURL();
    this.defaultHeaders = this.getDefaultHeaders();

    this.client = this.createClient(apiKey, options);

    // Log successful initialization
    this.logger?.info('Service initialized', {
      service: this.name,
      model: this.getModel(),
      baseURL: this.baseURL
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
    context?: Record<string, unknown>
  ): OpenAICompletionRequest {
    const baseParams: OpenAICompletionRequest = {
      model: this.getModel(),
      messages: formattedMessages,
      temperature: this.config.model.temperature || 0.7,
      max_tokens: this.config.model.maxTokens || 4000
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

  /**
   * Make the API request to the OpenAI-compatible endpoint
   */
  protected async makeAPIRequest(params: OpenAICompletionRequest): Promise<OpenAICompletionResponse> {
    if (!this.client) {
      throw new ServiceAPIError(
        'Client not initialized. Call initialize() first.',
        this.name
      );
    }

    try {
      const timeoutMs = this.config.timeout || 30000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await Promise.race([
        this.client.chat.completions.create(params),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener('abort', () => {
            reject(new ServiceTimeoutError(
              `Request timed out after ${timeoutMs}ms`,
              this.name,
              timeoutMs
            ));
          });
        })
      ]);

      clearTimeout(timeoutId);
      return response as OpenAICompletionResponse;

    } catch (error) {
      if (error instanceof ServiceTimeoutError) {
        throw error;
      }

      // Handle different types of errors
      if (error && typeof error === 'object' && 'status' in error) {
        const statusCode = (error as { status: number }).status;
        throw new ServiceAPIError(
          `API request failed with status ${statusCode}`,
          this.name,
          statusCode,
          error
        );
      }

      throw new ServiceAPIError(
        `API request failed: ${error instanceof Error ? error.message : String(error)}`,
        this.name,
        undefined,
        error
      );
    }
  }

  /**
   * Parse the API response and extract the content
   */
  protected parseResponse(apiResponse: OpenAICompletionResponse): ServiceResponse {
    const choice = apiResponse.choices[0];
    if (!choice?.message?.content) {
      throw new ServiceAPIError(
        'Invalid API response: missing content',
        this.name,
        undefined,
        apiResponse
      );
    }

    return {
      content: choice.message.content.trim(),
      usage: apiResponse.usage ? {
        promptTokens: apiResponse.usage.prompt_tokens,
        completionTokens: apiResponse.usage.completion_tokens,
        totalTokens: apiResponse.usage.total_tokens
      } : undefined,
      model: apiResponse.model,
      finishReason: choice.finish_reason,
      rawResponse: apiResponse
    };
  }

  /**
   * Generate response implementation for OpenAI-compatible services
   */
  protected async performGenerateResponse(
    messages: Message[],
    context?: Record<string, unknown>
  ): Promise<ServiceResponse> {
    // Format messages for API
    const formattedMessages = this.formatMessages(messages);

    // Process messages for service-specific requirements
    const processedMessages = this.processMessages(formattedMessages);

    // Prepare API request parameters
    const requestParams = this.prepareRequestParams(processedMessages, context);

    // Make the API request
    const apiResponse = await this.makeAPIRequest(requestParams);

    // Parse and return the response
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
        role: 'user',
        content: 'ping'
      };

      const response = await this.performGenerateResponse([testMessage]);
      return response.content.length > 0;

    } catch (error) {
      this.logger?.debug('Health check failed', {
        service: this.name,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Service-specific shutdown logic
   */
  protected async performShutdown(): Promise<void> {
    this.client = null;
    this.logger?.info('Service shut down', { service: this.name });
  }

  /**
   * Reset connection by reinitializing the client
   */
  protected async performConnectionReset(): Promise<void> {
    this.client = null;
    await this.performInitialization();
    this.logger?.info('Connection reset', { service: this.name });
  }

  /**
   * Get service-specific metadata
   */
  getMetadata(): Record<string, unknown> {
    return {
      ...super.getMetadata(),
      baseURL: this.baseURL,
      hasClient: !!this.client,
      supportsStreaming: (this.config as OpenAICompatibleServiceConfig).supportsStreaming ?? true
    };
  }
}
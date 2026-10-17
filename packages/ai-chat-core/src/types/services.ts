/**
 * Service-specific type definitions for AI Chat Core library
 */

import {
  IAIService,
  ServiceResponse,
  AIServiceConfig,
  ServiceInitOptions,
  Message,
} from "./index.js";

// Extended AI Service interface with complete contract
export interface IAIServiceExtended extends IAIService {
  initialize(options?: ServiceInitOptions): Promise<void>;
  generateResponse(
    messages: Message[],
    context?: Record<string, unknown>,
  ): Promise<ServiceResponse>;
  isConfigured(): boolean;
  getName(): string;
  getModel(): string;
  getEnhancedSystemPrompt(additionalContext?: string): string;
  validateConfiguration(): Promise<boolean>;

  // Additional service lifecycle methods
  shutdown(): Promise<void>;
  healthCheck(): Promise<boolean>;
  resetConnection(): Promise<void>;
}

// Service response with provider-specific metadata
export interface EnhancedServiceResponse<
  T = unknown,
> extends ServiceResponse<T> {
  responseTime?: number;
  requestId?: string;
  modelVersion?: string;
  cached?: boolean;
  metadata?: Record<string, unknown>;
}

// Provider-specific configuration interfaces
export interface OpenAIServiceConfig extends AIServiceConfig<"openai", string> {
  organization?: string;
  project?: string;
  dangerouslyAllowBrowser?: boolean;
}

// OpenAI-compatible service configuration (for services that use OpenAI API format)
export interface OpenAICompatibleServiceConfig extends AIServiceConfig {
  baseURL?: string;
  organization?: string;
  defaultHeaders?: Record<string, string>;
  supportsStreaming?: boolean;
}

// Client type for OpenAI-compatible providers
export interface OpenAIClient {
  chat: {
    completions: {
      create(
        params: OpenAICompletionRequest,
      ): Promise<OpenAICompletionResponse>;
    };
  };
}

// Request/Response types for the OpenAI chat completions API
export interface OpenAICompletionRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  stream?: boolean;
}

export interface OpenAICompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export type ServiceConstructor<T extends IAIService = IAIService> = new (
  config: AIServiceConfig,
) => T;

// Error types specific to services
export class ServiceInitializationError extends Error {
  constructor(
    message: string,
    public readonly service: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ServiceInitializationError";
  }
}

export class ServiceConfigurationError extends Error {
  constructor(
    message: string,
    public readonly service: string,
    public readonly missingFields?: string[],
  ) {
    super(message);
    this.name = "ServiceConfigurationError";
  }
}

export class ServiceAPIError extends Error {
  constructor(
    message: string,
    public readonly service: string,
    public readonly statusCode?: number,
    public readonly apiError?: unknown,
  ) {
    super(message);
    this.name = "ServiceAPIError";
  }
}

export class ServiceTimeoutError extends Error {
  constructor(
    message: string,
    public readonly service: string,
    public readonly timeoutMs: number,
  ) {
    super(message);
    this.name = "ServiceTimeoutError";
  }
}

// Re-export ServiceError for backward compatibility
export { ServiceError } from "./index.js";

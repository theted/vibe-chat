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

// Service initialization and configuration types
export interface ServiceInitializationOptions extends ServiceInitOptions {
  maxRetries?: number;
  retryDelay?: number;
  validateOnInit?: boolean;
  customHeaders?: Record<string, string>;
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

export interface AnthropicServiceConfig extends AIServiceConfig<
  "anthropic",
  string
> {
  defaultHeaders?: Record<string, string>;
}

export interface GeminiServiceConfig extends AIServiceConfig<"gemini", string> {
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
    stopSequences?: string[];
  };
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
}

// OpenAI-compatible service configuration (for services that use OpenAI API format)
export interface OpenAICompatibleServiceConfig extends AIServiceConfig {
  baseURL?: string;
  organization?: string;
  defaultHeaders?: Record<string, string>;
  supportsStreaming?: boolean;
}

// Client types for different providers
export interface OpenAIClient {
  chat: {
    completions: {
      create(
        params: OpenAICompletionRequest,
      ): Promise<OpenAICompletionResponse>;
    };
  };
}

export interface AnthropicClient {
  messages: {
    create(params: AnthropicMessageRequest): Promise<AnthropicMessageResponse>;
  };
}

export interface GeminiClient {
  generateContent(
    params: GeminiGenerateRequest,
  ): Promise<GeminiGenerateResponse>;
}

// Request/Response types for each provider
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

export interface AnthropicMessageRequest {
  model: string;
  max_tokens: number;
  messages: Array<{ role: string; content: string }>;
  system?: string;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stop_sequences?: string[];
  stream?: boolean;
}

export interface AnthropicMessageResponse {
  id: string;
  type: "message";
  role: "assistant";
  content: Array<{
    type: "text";
    text: string;
  }>;
  model: string;
  stop_reason: string | null;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface GeminiGenerateRequest {
  contents: Array<{
    role: string;
    parts: Array<{ text: string }>;
  }>;
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
    stopSequences?: string[];
  };
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
}

export interface GeminiGenerateResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason?: string;
    index: number;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  promptFeedback?: {
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  };
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

// Service factory types
export interface ServiceFactory {
  createService(provider: string, config: AIServiceConfig): IAIService;
  registerService(provider: string, constructor: ServiceConstructor): void;
  getSupportedProviders(): string[];
  isProviderSupported(provider: string): boolean;
}

export type ServiceConstructor<T extends IAIService = IAIService> = new (
  config: AIServiceConfig,
) => T;

export interface ServiceRegistryMap {
  [provider: string]: ServiceConstructor;
}

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

// Utility types for services
export type ProviderName =
  | "openai"
  | "anthropic"
  | "gemini"
  | "mistral"
  | "deepseek"
  | "grok"
  | "qwen"
  | "kimi"
  | "zai"
  | "cohere"
  | "llama"
  | "perplexity";

export type SupportedModel<T extends ProviderName> = T extends "openai"
  ? "gpt-4" | "gpt-3.5-turbo" | "gpt-4-turbo"
  : T extends "anthropic"
    ? "claude-3-opus" | "claude-3-sonnet" | "claude-3-haiku"
    : T extends "gemini"
      ? "gemini-pro" | "gemini-pro-vision"
      : string;

// Service status and health
export interface ServiceStatus {
  service: string;
  status: "healthy" | "unhealthy" | "unknown";
  lastChecked: number;
  responseTime?: number;
  error?: string;
}

export interface ServiceHealthReport {
  overall: "healthy" | "unhealthy" | "degraded";
  services: Record<string, ServiceStatus>;
  timestamp: number;
}

// Performance and metrics
export interface ServiceMetrics {
  requestCount: number;
  successRate: number;
  averageResponseTime: number;
  errorRate: number;
  lastError?: string;
  uptime: number;
}

export interface ServicePerformanceReport {
  service: string;
  metrics: ServiceMetrics;
  period: {
    start: number;
    end: number;
  };
}

// Re-export ServiceError for backward compatibility
export { ServiceError } from "./index.js";

// Type guards for service validation
export const isServiceResponse = (obj: unknown): obj is ServiceResponse => {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "content" in obj &&
    typeof (obj as ServiceResponse).content === "string"
  );
};

export const isEnhancedServiceResponse = (
  obj: unknown,
): obj is EnhancedServiceResponse => {
  return isServiceResponse(obj);
};

export const isOpenAIResponse = (
  obj: unknown,
): obj is OpenAICompletionResponse => {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "choices" in obj &&
    "model" in obj &&
    Array.isArray((obj as OpenAICompletionResponse).choices)
  );
};

export const isAnthropicResponse = (
  obj: unknown,
): obj is AnthropicMessageResponse => {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "content" in obj &&
    "type" in obj &&
    (obj as AnthropicMessageResponse).type === "message"
  );
};

export const isGeminiResponse = (
  obj: unknown,
): obj is GeminiGenerateResponse => {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "candidates" in obj &&
    Array.isArray((obj as GeminiGenerateResponse).candidates)
  );
};

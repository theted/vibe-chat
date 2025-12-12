/**
 * Core type definitions for AI Chat Core library
 */

// Base message structure
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
  id?: string;
  metadata?: Record<string, unknown>;
}

// Formatted message for AI services
export interface FormattedMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// AI Model configuration
export interface AIModel {
  id: string;
  maxTokens?: number;
  temperature?: number;
  maxTokensParam?: string;
  systemPrompt?: string;
  useResponsesApi?: boolean;
}

// Persona configuration
export interface PersonaTrait {
  basePersonality: string;
  traits: string[];
  speechPatterns: string[];
}

// Provider configuration
export interface AIProvider {
  name: string;
  persona?: PersonaTrait;
  models: Record<string, AIModel>;
  apiKeyEnvVar: string;
}

// Service configuration with generic provider/model types
export interface AIServiceConfig<P extends string = string, M extends string = string> {
  provider: {
    name: P;
    apiKeyEnvVar: string;
  };
  model: AIModel & { id: M };
  timeout?: number;
  retryAttempts?: number;
}

// Service initialization options
export interface ServiceInitOptions {
  apiKey?: string;
  baseURL?: string;
  timeout?: number;
  validateOnInit?: boolean;
}

// Chat formatting options
export interface ChatFormattingOptions {
  includeSystem?: boolean;
}

// OpenAI compatible message format
export interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Gemini message format
export interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

// Provider-specific response types
export interface ServiceResponse<T = unknown> {
  content: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  model?: string;
  finishReason?: string;
  rawResponse?: T;
}

export interface OpenAIResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

export interface AnthropicResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  model: string;
  stop_reason?: string;
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

// Stream text options
export interface StreamTextOptions {
  onChunk?: (chunk: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
}

// Logger levels
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

// Logger interface with strict typing
export interface Logger {
  error: <T extends Record<string, unknown> = Record<string, unknown>>(message: string, metadata?: T) => void;
  warn: <T extends Record<string, unknown> = Record<string, unknown>>(message: string, metadata?: T) => void;
  info: <T extends Record<string, unknown> = Record<string, unknown>>(message: string, metadata?: T) => void;
  debug: <T extends Record<string, unknown> = Record<string, unknown>>(message: string, metadata?: T) => void;
}

// Context manager types
export interface ConversationContext {
  messages: Message[];
  metadata?: Record<string, unknown>;
  maxHistory?: number;
}

// Message broker event types
export type MessageBrokerEvent =
  | 'message_sent'
  | 'message_received'
  | 'conversation_started'
  | 'conversation_ended'
  | 'error';

export interface MessageBrokerEventData {
  type: MessageBrokerEvent;
  payload: unknown;
  timestamp: number;
}

// Chat orchestrator configuration
export interface ChatOrchestratorConfig {
  maxConcurrentChats?: number;
  defaultTimeout?: number;
  retryAttempts?: number;
}

// Base AI Service interface
export interface IAIService {
  config: AIServiceConfig;
  name: string;
  isInitialized?: boolean;

  initialize(options?: ServiceInitOptions): Promise<void>;
  generateResponse(messages: Message[], context?: Record<string, unknown>): Promise<ServiceResponse>;
  isConfigured(): boolean;
  getName(): string;
  getModel(): string;
  getEnhancedSystemPrompt(additionalContext?: string): string;
  validateConfiguration(): Promise<boolean>;
  getConfig?(): AIServiceConfig;
  shutdown?(): Promise<void>;
}

// Service factory types
export type ServiceConstructor<T extends IAIService = IAIService> = new (config: AIServiceConfig) => T;

export type ServiceRegistry<T extends Record<string, IAIService> = Record<string, IAIService>> = {
  [K in keyof T]: ServiceConstructor<T[K]>;
}

// AI Response types
export interface AIResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason: string;
}

// Service-specific configuration types
export interface AnthropicServiceConfig extends AIServiceConfig {
  provider: {
    name: 'anthropic';
    displayName: string;
    apiKeyEnvVar: string;
  };
}

export interface GeminiServiceConfig extends AIServiceConfig {
  provider: {
    name: 'gemini';
    displayName: string;
    apiKeyEnvVar: string;
  };
}

// Error types
export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly errorType: 'configuration' | 'api_error' | 'initialization' | 'invalid_input' | 'response_parsing',
    public readonly service?: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export class AIServiceError extends Error {
  constructor(
    message: string,
    public readonly service?: string,
    public readonly originalError?: Error,
    public readonly errorCode?: string
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

export class ConfigurationError extends Error {
  constructor(message: string, public readonly field?: string, public readonly value?: unknown) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly responseData?: unknown
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class InitializationError extends Error {
  constructor(message: string, public readonly service?: string, public readonly details?: Record<string, unknown>) {
    super(message);
    this.name = 'InitializationError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public readonly field?: string, public readonly constraints?: string[]) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type AsyncResult<T> = Promise<T>;

export type AsyncCallback<T> = (result: T) => void | Promise<void>;

export type ErrorCallback = (error: Error) => void | Promise<void>;

// Type guards
export const isMessage = (obj: unknown): obj is Message => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'role' in obj &&
    'content' in obj &&
    typeof (obj as Message).content === 'string'
  );
};

export const isServiceResponse = (obj: unknown): obj is ServiceResponse => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'content' in obj &&
    typeof (obj as ServiceResponse).content === 'string'
  );
};

// Constants
export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_MAX_TOKENS = 4000;

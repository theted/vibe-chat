/**
 * Core type definitions for AI Chat Core library
 */
export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: number;
    id?: string;
    metadata?: Record<string, unknown>;
}
export interface FormattedMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}
export interface AIModel {
    id: string;
    maxTokens?: number;
    temperature?: number;
    maxTokensParam?: string;
    systemPrompt?: string;
    useResponsesApi?: boolean;
}
export interface PersonaTrait {
    basePersonality: string;
    traits: string[];
    speechPatterns: string[];
}
export interface AIProvider {
    name: string;
    persona?: PersonaTrait;
    models: Record<string, AIModel>;
    apiKeyEnvVar: string;
}
export interface AIServiceConfig<P extends string = string, M extends string = string> {
    provider: {
        name: P;
        apiKeyEnvVar: string;
        persona?: PersonaTrait;
    };
    model: AIModel & {
        id: M;
    };
    timeout?: number;
    retryAttempts?: number;
}
export interface ServiceInitOptions {
    apiKey?: string;
    baseURL?: string;
    timeout?: number;
    validateOnInit?: boolean;
}
export interface ChatFormattingOptions {
    includeSystem?: boolean;
}
export interface OpenAIMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}
export interface GeminiMessage {
    role: 'user' | 'model';
    parts: Array<{
        text: string;
    }>;
}
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
            parts: Array<{
                text: string;
            }>;
        };
        finishReason?: string;
    }>;
    usageMetadata?: {
        promptTokenCount: number;
        candidatesTokenCount: number;
        totalTokenCount: number;
    };
}
export interface StreamTextOptions {
    onChunk?: (chunk: string) => void;
    onComplete?: (fullText: string) => void;
    onError?: (error: Error) => void;
}
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';
export interface Logger {
    error: <T extends Record<string, unknown> = Record<string, unknown>>(message: string, metadata?: T) => void;
    warn: <T extends Record<string, unknown> = Record<string, unknown>>(message: string, metadata?: T) => void;
    info: <T extends Record<string, unknown> = Record<string, unknown>>(message: string, metadata?: T) => void;
    debug: <T extends Record<string, unknown> = Record<string, unknown>>(message: string, metadata?: T) => void;
}
export interface ConversationContext {
    messages: Message[];
    metadata?: Record<string, unknown>;
    maxHistory?: number;
}
export type MessageBrokerEvent = 'message_sent' | 'message_received' | 'conversation_started' | 'conversation_ended' | 'error';
export interface MessageBrokerEventData {
    type: MessageBrokerEvent;
    payload: unknown;
    timestamp: number;
}
export interface ChatOrchestratorConfig {
    maxConcurrentChats?: number;
    defaultTimeout?: number;
    retryAttempts?: number;
}
export interface IAIService {
    config: AIServiceConfig;
    name: string;
    initialize(options?: ServiceInitOptions): Promise<void>;
    generateResponse(messages: Message[], context?: Record<string, unknown>): Promise<ServiceResponse>;
    isConfigured(): boolean;
    isInitialized?(): boolean;
    getName(): string;
    getModel(): string;
    getEnhancedSystemPrompt(additionalContext?: string): string;
    validateConfiguration(): Promise<boolean>;
    getConfig?(): AIServiceConfig;
    shutdown?(): Promise<void>;
}
export type ServiceConstructor<T extends IAIService = IAIService> = new (config: AIServiceConfig) => T;
export type ServiceRegistry<T extends Record<string, IAIService> = Record<string, IAIService>> = {
    [K in keyof T]: ServiceConstructor<T[K]>;
};
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
export declare class ServiceError extends Error {
    readonly errorType: 'configuration' | 'api_error' | 'initialization' | 'invalid_input' | 'response_parsing';
    readonly service?: string;
    readonly details?: Record<string, unknown>;
    constructor(message: string, errorType: 'configuration' | 'api_error' | 'initialization' | 'invalid_input' | 'response_parsing', service?: string, details?: Record<string, unknown>);
}
export declare class AIServiceError extends Error {
    readonly service?: string;
    readonly originalError?: Error;
    readonly errorCode?: string;
    constructor(message: string, service?: string, originalError?: Error, errorCode?: string);
}
export declare class ConfigurationError extends Error {
    readonly field?: string;
    readonly value?: unknown;
    constructor(message: string, field?: string, value?: unknown);
}
export declare class NetworkError extends Error {
    readonly statusCode?: number;
    readonly responseData?: unknown;
    constructor(message: string, statusCode?: number, responseData?: unknown);
}
export declare class InitializationError extends Error {
    readonly service?: string;
    readonly details?: Record<string, unknown>;
    constructor(message: string, service?: string, details?: Record<string, unknown>);
}
export declare class ValidationError extends Error {
    readonly field?: string;
    readonly constraints?: string[];
    constructor(message: string, field?: string, constraints?: string[]);
}
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type AsyncResult<T> = Promise<T>;
export type AsyncCallback<T> = (result: T) => void | Promise<void>;
export type ErrorCallback = (error: Error) => void | Promise<void>;
export declare const isMessage: (obj: unknown) => obj is Message;
export declare const isServiceResponse: (obj: unknown) => obj is ServiceResponse;
export declare const DEFAULT_TEMPERATURE = 0.7;
export declare const DEFAULT_MAX_TOKENS = 4000;
//# sourceMappingURL=index.d.ts.map
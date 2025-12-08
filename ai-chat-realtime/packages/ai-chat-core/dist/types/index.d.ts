/**
 * Core type definitions for AI Chat Core library
 */
export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: number;
    id?: string;
}
export interface AIModel {
    id: string;
    maxTokens?: number;
    temperature?: number;
    maxTokensParam?: string;
    systemPrompt?: string;
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
export interface AIServiceConfig {
    provider: {
        name: string;
        apiKeyEnvVar: string;
    };
    model: AIModel;
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
export interface StreamTextOptions {
    onChunk?: (chunk: string) => void;
    onComplete?: (fullText: string) => void;
    onError?: (error: Error) => void;
}
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';
export interface Logger {
    error: (message: string, ...args: any[]) => void;
    warn: (message: string, ...args: any[]) => void;
    info: (message: string, ...args: any[]) => void;
    debug: (message: string, ...args: any[]) => void;
}
export interface ConversationContext {
    messages: Message[];
    metadata?: Record<string, any>;
    maxHistory?: number;
}
export type MessageBrokerEvent = 'message_sent' | 'message_received' | 'conversation_started' | 'conversation_ended' | 'error';
export interface MessageBrokerEventData {
    type: MessageBrokerEvent;
    payload: any;
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
    initialize(): Promise<void>;
    generateResponse(messages: Message[]): Promise<string>;
    isConfigured(): boolean;
    getName(): string;
    getModel(): string;
    getEnhancedSystemPrompt(): string;
}
export type ServiceConstructor = new (config: AIServiceConfig) => IAIService;
export interface ServiceRegistry {
    [key: string]: ServiceConstructor;
}
export declare class AIServiceError extends Error {
    readonly service?: string | undefined;
    readonly originalError?: Error | undefined;
    constructor(message: string, service?: string | undefined, originalError?: Error | undefined);
}
export declare class ConfigurationError extends Error {
    readonly field?: string | undefined;
    constructor(message: string, field?: string | undefined);
}
export declare class NetworkError extends Error {
    readonly statusCode?: number | undefined;
    constructor(message: string, statusCode?: number | undefined);
}
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;
export declare const DEFAULT_TEMPERATURE = 0.7;
export declare const DEFAULT_MAX_TOKENS = 4000;
//# sourceMappingURL=index.d.ts.map
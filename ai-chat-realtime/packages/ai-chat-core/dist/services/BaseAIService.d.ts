/**
 * Base AI Service
 *
 * This abstract class defines the interface for all AI service implementations.
 * Each AI provider should extend this class and implement its methods.
 */
import type { AIServiceConfig, Message, IAIService, ServiceResponse, ServiceInitOptions } from "../types/index.js";
export declare abstract class BaseAIService implements IAIService {
    readonly config: AIServiceConfig;
    name: string;
    protected initialized: boolean;
    constructor(config: AIServiceConfig);
    /**
     * Initialize the AI service
     */
    abstract initialize(options?: ServiceInitOptions): Promise<void>;
    /**
     * Generate a response based on the conversation history
     * @param messages - Array of message objects with role and content
     * @param context - Optional context for the request
     * @returns The generated response
     */
    abstract generateResponse(messages: Message[], context?: Record<string, unknown>): Promise<ServiceResponse>;
    /**
     * Check if the service is properly configured
     * @returns True if the service is properly configured
     */
    abstract isConfigured(): boolean;
    /**
     * Validate configuration
     * @returns True if configuration is valid
     */
    abstract validateConfiguration(): Promise<boolean>;
    /**
     * Get the name of the AI service
     * @returns The name of the AI service
     */
    getName(): string;
    /**
     * Get the model being used
     * @returns The model ID
     */
    getModel(): string;
    /**
     * Get the enhanced system prompt with persona traits
     * @param additionalContext - Optional additional context to include
     * @returns The system prompt enhanced with persona information
     */
    getEnhancedSystemPrompt(additionalContext?: string): string;
    /**
     * Get the service configuration
     * @returns The service configuration
     */
    getConfig(): AIServiceConfig;
    /**
     * Check if the service is initialized
     * @returns True if initialized
     */
    isInitialized(): boolean;
    /**
     * Shutdown the service
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=BaseAIService.d.ts.map
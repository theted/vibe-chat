/**
 * Base AI Service
 *
 * This abstract class defines the interface for all AI service implementations.
 * Each AI provider should extend this class and implement its methods.
 */
import type { AIServiceConfig, Message, IAIService } from "../types/index.js";
export declare abstract class BaseAIService implements IAIService {
    readonly config: AIServiceConfig;
    name: string;
    constructor(config: AIServiceConfig);
    /**
     * Initialize the AI service
     */
    abstract initialize(): Promise<void>;
    /**
     * Generate a response based on the conversation history
     * @param messages - Array of message objects with role and content
     * @returns The generated response
     */
    abstract generateResponse(messages: Message[]): Promise<string>;
    /**
     * Check if the service is properly configured
     * @returns True if the service is properly configured
     */
    abstract isConfigured(): boolean;
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
     * @returns The system prompt enhanced with persona information
     */
    getEnhancedSystemPrompt(): string;
}
//# sourceMappingURL=BaseAIService.d.ts.map
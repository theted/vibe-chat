/**
 * OpenAI Service
 *
 * This service handles interactions with the OpenAI API.
 */
import { BaseAIService } from "./BaseAIService.js";
import type { AIServiceConfig, Message } from "../types/index.js";
export declare class OpenAIService extends BaseAIService {
    private client;
    constructor(config: AIServiceConfig);
    /**
     * Initialize the OpenAI client
     */
    initialize(): Promise<void>;
    /**
     * Check if the OpenAI service is properly configured
     * @returns True if the API key is available
     */
    isConfigured(): boolean;
    /**
     * Generate a response using OpenAI
     * @param messages - Array of message objects with role and content
     * @returns The generated response
     */
    generateResponse(messages: Message[]): Promise<string>;
}
//# sourceMappingURL=OpenAIService.d.ts.map
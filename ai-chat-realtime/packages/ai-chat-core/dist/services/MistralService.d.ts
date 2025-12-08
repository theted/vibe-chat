/**
 * Mistral Service
 *
 * This service handles interactions with the Mistral AI API.
 */
import { BaseAIService } from "./BaseAIService.js";
import type { AIServiceConfig, Message } from "../types/index.js";
export declare class MistralService extends BaseAIService {
    private client;
    constructor(config: AIServiceConfig);
    /**
     * Initialize the Mistral client
     */
    initialize(): Promise<void>;
    /**
     * Check if the Mistral service is properly configured
     * @returns True if the API key is available
     */
    isConfigured(): boolean;
    /**
     * Generate a response using Mistral
     * @param messages - Array of message objects with role and content
     * @returns The generated response
     */
    generateResponse(messages: Message[]): Promise<string>;
}
//# sourceMappingURL=MistralService.d.ts.map
/**
 * Deepseek Service
 *
 * This service handles interactions with the Deepseek API.
 */
import { BaseAIService } from "./BaseAIService.js";
import type { AIServiceConfig, Message } from "../types/index.js";
export declare class DeepseekService extends BaseAIService {
    private client;
    constructor(config: AIServiceConfig);
    /**
     * Initialize the Deepseek client
     */
    initialize(): Promise<void>;
    /**
     * Check if the Deepseek service is properly configured
     * @returns True if the API key is available
     */
    isConfigured(): boolean;
    /**
     * Generate a response using Deepseek
     * @param messages - Array of message objects with role and content
     * @returns The generated response
     */
    generateResponse(messages: Message[]): Promise<string>;
}
//# sourceMappingURL=DeepseekService.d.ts.map
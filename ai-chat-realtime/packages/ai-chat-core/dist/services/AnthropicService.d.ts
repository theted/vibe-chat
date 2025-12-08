/**
 * Anthropic Service
 *
 * This service handles interactions with the Anthropic API.
 */
import { BaseAIService } from "./BaseAIService.js";
import type { AIServiceConfig, Message } from "../types/index.js";
export declare class AnthropicService extends BaseAIService {
    private client;
    constructor(config: AIServiceConfig);
    /**
     * Initialize the Anthropic client
     */
    initialize(): Promise<void>;
    /**
     * Check if the Anthropic service is properly configured
     * @returns True if the API key is available
     */
    isConfigured(): boolean;
    /**
     * Generate a response using Anthropic
     * @param messages - Array of message objects with role and content
     * @returns The generated response
     */
    generateResponse(messages: Message[]): Promise<string>;
}
//# sourceMappingURL=AnthropicService.d.ts.map
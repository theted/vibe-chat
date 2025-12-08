/**
 * Gemini Service
 *
 * This service handles interactions with the Google Gemini AI API.
 */
import { BaseAIService } from "./BaseAIService.js";
import type { AIServiceConfig, Message } from "../types/index.js";
export declare class GeminiService extends BaseAIService {
    private client;
    private model;
    constructor(config: AIServiceConfig);
    /**
     * Initialize the Gemini client
     */
    initialize(): Promise<void>;
    /**
     * Check if the Gemini service is properly configured
     * @returns True if the API key is available
     */
    isConfigured(): boolean;
    /**
     * Generate a response using Gemini
     * @param messages - Array of message objects with role and content
     * @returns The generated response
     */
    generateResponse(messages: Message[]): Promise<string>;
}
//# sourceMappingURL=GeminiService.d.ts.map
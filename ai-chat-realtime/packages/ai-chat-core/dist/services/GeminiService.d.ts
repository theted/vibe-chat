/**
 * Gemini Service
 *
 * This service handles interactions with the Google Gemini AI API.
 */
import { BaseAIService } from "./base/BaseAIService.js";
import { Message, AIResponse, GeminiServiceConfig } from "../types/index.js";
export declare class GeminiService extends BaseAIService<GeminiServiceConfig> {
    private client;
    private model;
    constructor(config: GeminiServiceConfig);
    /**
     * Initialize the Gemini client
     */
    initialize(): Promise<void>;
    /**
     * Check if the Gemini service is properly configured
     */
    isConfigured(): boolean;
    /**
     * Generate a response using Gemini
     */
    generateResponse(messages: Message[]): Promise<AIResponse>;
    /**
     * Health check for the Gemini service
     */
    healthCheck(): Promise<boolean>;
    /**
     * Reset the connection (reinitialize client)
     */
    resetConnection(): Promise<void>;
    /**
     * Get service-specific information
     */
    getServiceInfo(): Record<string, unknown>;
    /**
     * Shutdown the service
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=GeminiService.d.ts.map
/**
 * Deepseek Service
 *
 * This service handles interactions with the Deepseek API.
 */
import { BaseAIService } from "./BaseAIService.js";
import type { AIServiceConfig, Message, ServiceResponse, ServiceInitOptions } from "../types/index.js";
export declare class DeepseekService extends BaseAIService {
    private client;
    constructor(config: AIServiceConfig);
    /**
     * Initialize the Deepseek client
     */
    initialize(options?: ServiceInitOptions): Promise<void>;
    /**
     * Check if the Deepseek service is properly configured
     * @returns True if the API key is available
     */
    isConfigured(): boolean;
    /**
     * Generate a response using Deepseek
     * @param messages - Array of message objects with role and content
     * @param context - Optional context for the request
     * @returns The generated response
     */
    generateResponse(messages: Message[], context?: Record<string, unknown>): Promise<ServiceResponse>;
    validateConfiguration(): Promise<boolean>;
}
//# sourceMappingURL=DeepseekService.d.ts.map
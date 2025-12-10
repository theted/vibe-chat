/**
 * Anthropic Service
 *
 * This service handles interactions with the Anthropic API.
 */
import { BaseAIService } from "./BaseAIService.js";
import { Message, ServiceResponse, AnthropicServiceConfig, ServiceInitOptions } from "../types/index.js";
export declare class AnthropicService extends BaseAIService {
    private client;
    private lastInitTime?;
    constructor(config: AnthropicServiceConfig);
    /**
     * Initialize the Anthropic client
     */
    initialize(options?: ServiceInitOptions): Promise<void>;
    /**
     * Check if the Anthropic service is properly configured
     */
    isConfigured(): boolean;
    /**
     * Generate a response using Anthropic
     */
    generateResponse(messages: Message[], context?: Record<string, unknown>): Promise<ServiceResponse>;
    /**
     * Health check for the Anthropic service
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
     * Validate configuration
     */
    validateConfiguration(): Promise<boolean>;
    /**
     * Shutdown the service
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=AnthropicService.d.ts.map
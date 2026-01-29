/**
 * Anthropic Service
 *
 * This service handles interactions with the Anthropic API.
 */
import { BaseAIService } from "./base/BaseAIService.js";
import { Message, ServiceResponse, AnthropicServiceConfig, ServiceInitOptions } from "../types/index.js";
export declare class AnthropicService extends BaseAIService {
    private client;
    constructor(config: AnthropicServiceConfig);
    /**
     * Initialize the Anthropic client
     */
    protected performInitialization(_options?: ServiceInitOptions): Promise<void>;
    /**
     * Generate a response using Anthropic
     */
    protected performGenerateResponse(messages: Message[], _context?: Record<string, unknown>): Promise<ServiceResponse>;
    /**
     * Health check for the Anthropic service
     */
    protected performHealthCheck(): Promise<boolean>;
    /**
     * Shutdown the service
     */
    protected performShutdown(): Promise<void>;
    /**
     * Reset the connection
     */
    protected performConnectionReset(): Promise<void>;
}
//# sourceMappingURL=AnthropicService.d.ts.map
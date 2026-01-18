/**
 * Gemini Service
 *
 * This service handles interactions with the Google Gemini AI API.
 */
import { BaseAIService } from "./base/BaseAIService.js";
import { Message, ServiceResponse, GeminiServiceConfig, ServiceInitOptions } from "../types/index.js";
export declare class GeminiService extends BaseAIService {
    private client;
    private geminiModel;
    constructor(config: GeminiServiceConfig);
    /**
     * Initialize the Gemini client
     */
    protected performInitialization(_options?: ServiceInitOptions): Promise<void>;
    /**
     * Generate a response using Gemini
     */
    protected performGenerateResponse(messages: Message[]): Promise<ServiceResponse>;
    /**
     * Health check for the Gemini service
     */
    protected performHealthCheck(): Promise<boolean>;
    /**
     * Reset the connection (reinitialize client)
     */
    protected performConnectionReset(): Promise<void>;
    /**
     * Shutdown the service
     */
    protected performShutdown(): Promise<void>;
}
//# sourceMappingURL=GeminiService.d.ts.map
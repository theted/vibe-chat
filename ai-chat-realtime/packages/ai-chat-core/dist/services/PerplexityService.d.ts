/**
 * PerplexityService Service - TypeScript conversion
 */
import { BaseAIService } from "./BaseAIService.js";
import type { AIServiceConfig, Message } from "../types/index.js";
export declare class PerplexityService extends BaseAIService {
    private client;
    constructor(config: AIServiceConfig);
    initialize(): Promise<void>;
    isConfigured(): boolean;
    generateResponse(messages: Message[]): Promise<string>;
}
//# sourceMappingURL=PerplexityService.d.ts.map
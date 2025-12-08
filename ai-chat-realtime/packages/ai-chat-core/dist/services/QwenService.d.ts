/**
 * QwenService Service - TypeScript conversion
 */
import { BaseAIService } from "./BaseAIService.js";
import type { AIServiceConfig, Message } from "../types/index.js";
export declare class QwenService extends BaseAIService {
    private client;
    constructor(config: AIServiceConfig);
    initialize(): Promise<void>;
    isConfigured(): boolean;
    generateResponse(messages: Message[]): Promise<string>;
}
//# sourceMappingURL=QwenService.d.ts.map
/**
 * ZaiService Service - TypeScript conversion
 */
import { BaseAIService } from "./BaseAIService.js";
import type { AIServiceConfig, Message } from "../types/index.js";
export declare class ZaiService extends BaseAIService {
    private client;
    constructor(config: AIServiceConfig);
    initialize(): Promise<void>;
    isConfigured(): boolean;
    generateResponse(messages: Message[]): Promise<string>;
}
//# sourceMappingURL=ZaiService.d.ts.map
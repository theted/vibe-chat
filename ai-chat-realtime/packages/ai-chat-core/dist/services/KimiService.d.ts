/**
 * KimiService Service - TypeScript conversion
 */
import { BaseAIService } from "./BaseAIService.js";
import type { AIServiceConfig, Message } from "../types/index.js";
export declare class KimiService extends BaseAIService {
    private client;
    constructor(config: AIServiceConfig);
    initialize(): Promise<void>;
    isConfigured(): boolean;
    generateResponse(messages: Message[]): Promise<string>;
}
//# sourceMappingURL=KimiService.d.ts.map
/**
 * KimiService Service - TypeScript conversion
 */
import { BaseAIService } from "./BaseAIService.js";
import type { AIServiceConfig, Message, ServiceResponse, ServiceInitOptions } from "../types/index.js";
export declare class KimiService extends BaseAIService {
    private client;
    constructor(config: AIServiceConfig);
    initialize(options?: ServiceInitOptions): Promise<void>;
    isConfigured(): boolean;
    generateResponse(messages: Message[], context?: Record<string, unknown>): Promise<ServiceResponse>;
    validateConfiguration(): Promise<boolean>;
}
//# sourceMappingURL=KimiService.d.ts.map
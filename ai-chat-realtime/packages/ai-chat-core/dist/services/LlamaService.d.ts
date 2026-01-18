/**
 * LlamaService Service - TypeScript conversion
 */
import { BaseAIService } from "./base/BaseAIService.js";
import type { AIServiceConfig, Message, ServiceResponse, ServiceInitOptions } from "../types/index.js";
export declare class LlamaService extends BaseAIService {
    private client;
    constructor(config: AIServiceConfig);
    protected performInitialization(_options?: ServiceInitOptions): Promise<void>;
    protected performGenerateResponse(messages: Message[]): Promise<ServiceResponse>;
}
//# sourceMappingURL=LlamaService.d.ts.map
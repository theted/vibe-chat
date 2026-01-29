/**
 * Deepseek Service
 *
 * This service handles interactions with the Deepseek API.
 * Deepseek uses an OpenAI-compatible API format.
 */
import { OpenAICompatibleService } from "./base/OpenAICompatibleService.js";
import { OpenAIClient } from "../types/services.js";
import { AIServiceConfig, ServiceInitOptions } from "../types/index.js";
export declare class DeepseekService extends OpenAICompatibleService {
    constructor(config: AIServiceConfig);
    protected createClient(apiKey: string, options?: ServiceInitOptions): OpenAIClient;
}
//# sourceMappingURL=DeepseekService.d.ts.map
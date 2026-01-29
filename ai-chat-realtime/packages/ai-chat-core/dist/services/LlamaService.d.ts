/**
 * Llama Service
 *
 * This service handles interactions with the Llama API.
 * Llama uses an OpenAI-compatible API format.
 */
import { OpenAICompatibleService } from "./base/OpenAICompatibleService.js";
import { OpenAIClient } from "../types/services.js";
import { AIServiceConfig, ServiceInitOptions } from "../types/index.js";
export declare class LlamaService extends OpenAICompatibleService {
    constructor(config: AIServiceConfig);
    protected createClient(apiKey: string, options?: ServiceInitOptions): OpenAIClient;
}
//# sourceMappingURL=LlamaService.d.ts.map
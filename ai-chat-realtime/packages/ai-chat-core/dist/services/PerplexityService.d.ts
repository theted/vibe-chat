/**
 * Perplexity Service
 *
 * This service handles interactions with the Perplexity AI API.
 * Perplexity uses an OpenAI-compatible API format.
 */
import { OpenAICompatibleService } from "./base/OpenAICompatibleService.js";
import { OpenAIClient } from "../types/services.js";
import { AIServiceConfig, ServiceInitOptions } from "../types/index.js";
export declare class PerplexityService extends OpenAICompatibleService {
    constructor(config: AIServiceConfig);
    protected createClient(apiKey: string, options?: ServiceInitOptions): OpenAIClient;
}
//# sourceMappingURL=PerplexityService.d.ts.map
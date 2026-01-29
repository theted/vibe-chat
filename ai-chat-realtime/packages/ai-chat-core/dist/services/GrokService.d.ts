/**
 * Grok Service
 *
 * This service handles interactions with the Grok (xAI) API.
 * Grok uses an OpenAI-compatible API format.
 */
import { OpenAICompatibleService } from "./base/OpenAICompatibleService.js";
import { OpenAIClient } from "../types/services.js";
import { AIServiceConfig, ServiceInitOptions } from "../types/index.js";
export declare class GrokService extends OpenAICompatibleService {
    constructor(config: AIServiceConfig);
    protected createClient(apiKey: string, options?: ServiceInitOptions): OpenAIClient;
}
//# sourceMappingURL=GrokService.d.ts.map
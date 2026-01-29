/**
 * Qwen Service
 *
 * This service handles interactions with the Qwen (Alibaba) API.
 * Qwen uses an OpenAI-compatible API format via DashScope.
 */
import { OpenAICompatibleService } from "./base/OpenAICompatibleService.js";
import { OpenAIClient } from "../types/services.js";
import { AIServiceConfig, ServiceInitOptions } from "../types/index.js";
export declare class QwenService extends OpenAICompatibleService {
    constructor(config: AIServiceConfig);
    protected createClient(apiKey: string, options?: ServiceInitOptions): OpenAIClient;
}
//# sourceMappingURL=QwenService.d.ts.map
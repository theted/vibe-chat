/**
 * Mistral Service
 *
 * This service handles interactions with the Mistral AI API.
 */
import { OpenAICompatibleService } from "./base/OpenAICompatibleService.js";
import { OpenAIClient } from "../types/services.js";
import { AIServiceConfig, ServiceInitOptions, OpenAIMessage } from "../types/index.js";
export declare class MistralService extends OpenAICompatibleService {
    constructor(config: AIServiceConfig);
    /**
     * Create the Mistral client (which is OpenAI-compatible)
     */
    protected createClient(apiKey: string, options?: ServiceInitOptions): OpenAIClient;
    /**
     * Process messages for Mistral-specific requirements
     * Mistral requires: system messages first, then alternating user/assistant
     * Last message must be from user or tool, not assistant
     */
    protected processMessages(messages: OpenAIMessage[]): OpenAIMessage[];
}
//# sourceMappingURL=MistralService.d.ts.map
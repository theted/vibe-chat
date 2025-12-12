/**
 * OpenAI Service
 *
 * This service handles interactions with the OpenAI API.
 */
import { OpenAICompatibleService } from './base/OpenAICompatibleService.js';
import { OpenAIClient } from '../types/services.js';
import { AIServiceConfig, ServiceInitOptions, OpenAIMessage } from '../types/index.js';
export declare class OpenAIService extends OpenAICompatibleService {
    constructor(config: AIServiceConfig);
    /**
     * Create the OpenAI client with proper typing
     */
    protected createClient(apiKey: string, options?: ServiceInitOptions): OpenAIClient;
    /**
     * OpenAI doesn't need custom message processing
     * Messages are used as-is from the base class formatting
     */
    protected processMessages(messages: OpenAIMessage[]): OpenAIMessage[];
}
//# sourceMappingURL=OpenAIService.d.ts.map
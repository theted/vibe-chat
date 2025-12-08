/**
 * AI Provider Configuration
 *
 * This file exports all AI providers and related utilities.
 * Provider definitions are now split into separate files for better organization.
 */
import type { AIProvider, AIServiceConfig } from "../../types/index.js";
export { DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS, SHORT_RESPONSE_MAX_TOKENS, DEFAULT_CONVERSATION_CONFIG, } from "./constants.js";
export { ANTHROPIC } from "./providers/anthropic.js";
export { OPENAI } from "./providers/openai.js";
export { COHERE } from "./providers/cohere.js";
export { ZAI } from "./providers/zai.js";
export { GROK } from "./providers/grok.js";
export { GEMINI } from "./providers/gemini.js";
export { MISTRAL } from "./providers/mistral.js";
export { DEEPSEEK } from "./providers/deepseek.js";
export { QWEN } from "./providers/qwen.js";
export { KIMI } from "./providers/kimi.js";
export { LLAMA } from "./providers/llama.js";
export { PERPLEXITY } from "./providers/perplexity.js";
/**
 * All AI providers collection - maintains backward compatibility
 */
export declare const AI_PROVIDERS: {
    readonly COHERE: AIProvider;
    readonly ZAI: AIProvider;
    readonly GROK: AIProvider;
    readonly GEMINI: AIProvider;
    readonly MISTRAL: AIProvider;
    readonly OPENAI: AIProvider;
    readonly ANTHROPIC: AIProvider;
    readonly DEEPSEEK: AIProvider;
    readonly QWEN: AIProvider;
    readonly KIMI: AIProvider;
    readonly LLAMA: AIProvider;
    readonly PERPLEXITY: AIProvider;
};
/**
 * Get a random AI provider and model
 * @returns Provider and model configuration
 */
export declare function getRandomAIConfig(): AIServiceConfig;
//# sourceMappingURL=index.d.ts.map
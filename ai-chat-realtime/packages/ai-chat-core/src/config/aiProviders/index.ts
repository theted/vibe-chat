/**
 * AI Provider Configuration
 *
 * This file exports all AI providers and related utilities.
 * Provider definitions are now split into separate files for better organization.
 */

import type { AIProvider, AIServiceConfig } from "@/types/index.js";

// Export constants
export {
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
  SHORT_RESPONSE_MAX_TOKENS,
  DEFAULT_CONVERSATION_CONFIG,
} from "./constants.js";

// Export all providers
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

// Import all providers for the main collection
import { ANTHROPIC } from "./providers/anthropic.js";
import { OPENAI } from "./providers/openai.js";
import { COHERE } from "./providers/cohere.js";
import { ZAI } from "./providers/zai.js";
import { GROK } from "./providers/grok.js";
import { GEMINI } from "./providers/gemini.js";
import { MISTRAL } from "./providers/mistral.js";
import { DEEPSEEK } from "./providers/deepseek.js";
import { QWEN } from "./providers/qwen.js";
import { KIMI } from "./providers/kimi.js";
import { LLAMA } from "./providers/llama.js";
import { PERPLEXITY } from "./providers/perplexity.js";

/**
 * All AI providers collection - maintains backward compatibility
 */
export const AI_PROVIDERS = {
  COHERE,
  ZAI,
  GROK,
  GEMINI,
  MISTRAL,
  OPENAI,
  ANTHROPIC,
  DEEPSEEK,
  QWEN,
  KIMI,
  LLAMA,
  PERPLEXITY,
} as const;

/**
 * Get a random AI provider and model
 * @returns Provider and model configuration
 */
export function getRandomAIConfig(): AIServiceConfig {
  const providers = Object.values(AI_PROVIDERS);
  const randomProvider =
    providers[Math.floor(Math.random() * providers.length)];

  const models = Object.values(randomProvider.models);
  const randomModel = models[Math.floor(Math.random() * models.length)];

  return {
    provider: randomProvider,
    model: randomModel,
  };
}
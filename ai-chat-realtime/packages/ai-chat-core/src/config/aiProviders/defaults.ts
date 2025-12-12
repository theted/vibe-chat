/**
 * Default model mappings for each provider
 * Centralizes the logic for selecting default models when none are specified
 */

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
import type { AIModel } from "../../types/index.js";

/**
 * Default models for each provider
 * TODO: Update with actual model keys from converted provider files
 */
export const DEFAULT_MODELS: Record<string, AIModel> = {
  // TODO: These need to be updated with actual model references once providers are fully converted
  [OPENAI.name]: OPENAI.models.GPT4O,
  // Add other providers as they are fully converted
};
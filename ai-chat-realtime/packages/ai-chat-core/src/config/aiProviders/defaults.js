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

/**
 * Default models for each provider
 */
export const DEFAULT_MODELS = {
  [COHERE.name]: COHERE.models.COMMAND_A_03_2025,
  [ZAI.name]: ZAI.models.ZAI_DEFAULT,
  [GEMINI.name]: GEMINI.models.GEMINI_25,
  [MISTRAL.name]: MISTRAL.models.MISTRAL_LARGE,
  [OPENAI.name]: OPENAI.models.GPT4O,
  [ANTHROPIC.name]: ANTHROPIC.models.CLAUDE3_7_SONNET,
  [DEEPSEEK.name]: DEEPSEEK.models.DEEPSEEK_CHAT,
  [GROK.name]: GROK.models.GROK_3,
  [QWEN.name]: QWEN.models.QWEN3_MAX,
  [KIMI.name]: KIMI.models.KIMI_8K,
  [LLAMA.name]: LLAMA.models.LLAMA_3_1_70B_INSTRUCT,
  [PERPLEXITY.name]: PERPLEXITY.models.PERPLEXITY_SONAR_LARGE,
};

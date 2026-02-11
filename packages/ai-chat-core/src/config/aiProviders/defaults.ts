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
import { AMAZON } from "./providers/amazon.js";
import { NVIDIA } from "./providers/nvidia.js";
import { XIAOMI } from "./providers/xiaomi.js";
import { MINIMAX } from "./providers/minimax.js";
import { BAIDU } from "./providers/baidu.js";
import { BYTEDANCE } from "./providers/bytedance.js";
import { HUGGINGFACE } from "./providers/huggingface.js";
import { PERPLEXITY } from "./providers/perplexity.js";
import type { AIModel } from "@/types/index.js";

/**
 * Default models for each provider
 */
export const DEFAULT_MODELS: Record<string, AIModel> = {
  [COHERE.name]: COHERE.models.COMMAND_A_03_2025,
  [ZAI.name]: ZAI.models.ZAI_GLM_5,
  [GEMINI.name]: GEMINI.models.GEMINI_3_PRO,
  [MISTRAL.name]: MISTRAL.models.MISTRAL_LARGE,
  [OPENAI.name]: OPENAI.models.GPT5_2,
  [ANTHROPIC.name]: ANTHROPIC.models.CLAUDE_SONNET_4_5,
  [DEEPSEEK.name]: DEEPSEEK.models.DEEPSEEK_CHAT,
  [GROK.name]: GROK.models.GROK_4_0709,
  [QWEN.name]: QWEN.models.QWEN3_MAX,
  [KIMI.name]: KIMI.models.KIMI_K2_5,
  [LLAMA.name]: LLAMA.models.LLAMA_4_MAVERICK,
  [AMAZON.name]: AMAZON.models.NOVA_PRO_V1,
  [NVIDIA.name]: NVIDIA.models.NEMOTRON_3_NANO_30B_A3B,
  [XIAOMI.name]: XIAOMI.models.MIMO_V2_FLASH,
  [MINIMAX.name]: MINIMAX.models.MINIMAX_M2_1,
  [BAIDU.name]: BAIDU.models.ERNIE_4_5_21B_A3B,
  [BYTEDANCE.name]: BYTEDANCE.models.SEED_1_6,
  [HUGGINGFACE.name]: HUGGINGFACE.models.ZEPHYR_141B_A35B,
  [PERPLEXITY.name]: PERPLEXITY.models.SONAR_PRO,
};

/**
 * AI Provider Configuration
 *
 * This file exports all AI providers and related utilities.
 * Provider definitions are now split into separate files for better organization.
 */

import type { AIServiceConfig } from "@/types/index.js";

// Export constants
export {
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
  SHORT_RESPONSE_MAX_TOKENS,
  DEFAULT_CONVERSATION_CONFIG,
} from "./constants.js";

// Export default models
export { DEFAULT_MODELS } from "./defaults.js";

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
import { AMAZON } from "./providers/amazon.js";
import { NVIDIA } from "./providers/nvidia.js";
import { XIAOMI } from "./providers/xiaomi.js";
import { MINIMAX } from "./providers/minimax.js";
import { BAIDU } from "./providers/baidu.js";
import { BYTEDANCE } from "./providers/bytedance.js";
import { HUGGINGFACE } from "./providers/huggingface.js";
import { PERPLEXITY } from "./providers/perplexity.js";
import { ARCEE } from "./providers/arcee.js";
import { STEPFUN } from "./providers/stepfun.js";
import { INFLECTION } from "./providers/inflection.js";
import { ZEROONEAI } from "./providers/01ai.js";
import { DATABRICKS } from "./providers/databricks.js";
import { NOUS } from "./providers/nous.js";
import { PHIND } from "./providers/phind.js";
import { MICROSOFT } from "./providers/microsoft.js";
import { SNOWFLAKE } from "./providers/snowflake.js";
import { INCEPTION } from "./providers/inception.js";
import { SAKANA } from "./providers/sakana.js";
import { META_MUSE } from "./providers/metamuse.js";
import { PRISMML } from "./providers/prismml.js";
import { UNBIASED } from "./providers/unbiased.js";
import { NEXAGI } from "./providers/nexagi.js";
import { INCLUSIONAI } from "./providers/inclusionai.js";
import { LIQUID } from "./providers/liquid.js";
import { THINKING_MACHINES } from "./providers/thinkingmachines.js";
import { TENCENT } from "./providers/tencent.js";
import { MEITUAN } from "./providers/meituan.js";
import { UPSTAGE } from "./providers/upstage.js";
import { IBM } from "./providers/ibm.js";
import { WRITER } from "./providers/writer.js";
import { POOLSIDE } from "./providers/poolside.js";

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
  AMAZON,
  NVIDIA,
  XIAOMI,
  MINIMAX,
  BAIDU,
  BYTEDANCE,
  HUGGINGFACE,
  PERPLEXITY,
  ARCEE,
  STEPFUN,
  INFLECTION,
  ZEROONEAI,
  DATABRICKS,
  NOUS,
  PHIND,
  MICROSOFT,
  SNOWFLAKE,
  INCEPTION,
  SAKANA,
  META_MUSE,
  PRISMML,
  UNBIASED,
  NEXAGI,
  INCLUSIONAI,
  LIQUID,
  THINKING_MACHINES,
  TENCENT,
  MEITUAN,
  UPSTAGE,
  IBM,
  WRITER,
  POOLSIDE,
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

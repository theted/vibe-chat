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
import type { AIModel, AIProvider } from "@/types/index.js";

/**
 * Providers whose default is NOT their first declared model.
 *
 * Every other provider falls back to the first entry in its `models` object,
 * which by convention is the newest. Deriving the fallback means a provider can
 * never silently end up without a default — previously nine providers had no
 * mapping at all, and two more pointed at model keys that had been removed, so
 * callers omitting a model got `undefined`.
 */
const EXPLICIT_DEFAULTS = new Map<AIProvider, string>([
  // Fable 5.1 is listed first but costs twice Opus 5, Anthropic's recommended default.
  [ANTHROPIC, "CLAUDE_OPUS_5"],
  [MISTRAL, "MISTRAL_LARGE"],
  [LLAMA, "LLAMA_4_MAVERICK"],
  [AMAZON, "NOVA_PRO_V1"],
  [PERPLEXITY, "SONAR_PRO"],
  [NOUS, "HERMES_4_405B"],
]);

const ALL_PROVIDERS: AIProvider[] = [
  ANTHROPIC,
  OPENAI,
  COHERE,
  ZAI,
  GROK,
  GEMINI,
  MISTRAL,
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
];

const resolveDefaultModel = (provider: AIProvider): AIModel => {
  const preferredKey = EXPLICIT_DEFAULTS.get(provider);
  return (
    (preferredKey ? provider.models[preferredKey] : undefined) ??
    Object.values(provider.models)[0]
  );
};

/**
 * Default models for each provider, keyed by provider display name.
 */
export const DEFAULT_MODELS: Record<string, AIModel> = Object.fromEntries(
  ALL_PROVIDERS.map((provider) => [
    provider.name,
    resolveDefaultModel(provider),
  ]),
);

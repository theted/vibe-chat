import type { AiParticipant } from "./types.js";
import { ANTHROPIC_PARTICIPANTS } from "./participants/anthropic.js";
import { OPENAI_PARTICIPANTS } from "./participants/openai.js";
import { GROK_PARTICIPANTS } from "./participants/grok.js";
import { GEMINI_PARTICIPANTS } from "./participants/gemini.js";
import { COHERE_PARTICIPANTS } from "./participants/cohere.js";
import { MISTRAL_PARTICIPANTS } from "./participants/mistral.js";
import { DEEPSEEK_PARTICIPANTS } from "./participants/deepseek.js";
import { KIMI_PARTICIPANTS } from "./participants/kimi.js";
import { QWEN_PARTICIPANTS } from "./participants/qwen.js";
import { ZAI_PARTICIPANTS } from "./participants/zai.js";
import { META_PARTICIPANTS } from "./participants/meta.js";
import { AMAZON_PARTICIPANTS } from "./participants/amazon.js";
import { NVIDIA_PARTICIPANTS } from "./participants/nvidia.js";
import { MINIMAX_PARTICIPANTS } from "./participants/minimax.js";
import { BYTEDANCE_PARTICIPANTS } from "./participants/bytedance.js";
import { HUGGINGFACE_PARTICIPANTS } from "./participants/huggingface.js";
import { INFLECTION_PARTICIPANTS } from "./participants/inflection.js";
import { ZEROONE_PARTICIPANTS } from "./participants/zeroone.js";
import { DATABRICKS_PARTICIPANTS } from "./participants/databricks.js";
import { NOUS_PARTICIPANTS } from "./participants/nous.js";
import { PHIND_PARTICIPANTS } from "./participants/phind.js";
import { MICROSOFT_PARTICIPANTS } from "./participants/microsoft.js";
import { SNOWFLAKE_PARTICIPANTS } from "./participants/snowflake.js";
import { PERPLEXITY_PARTICIPANTS } from "./participants/perplexity.js";
import { XIAOMI_PARTICIPANTS } from "./participants/xiaomi.js";
import { BAIDU_PARTICIPANTS } from "./participants/baidu.js";
import { ARCEE_PARTICIPANTS } from "./participants/arcee.js";
import { STEPFUN_PARTICIPANTS } from "./participants/stepfun.js";
import { INCEPTION_PARTICIPANTS } from "./participants/inception.js";
import { SAKANA_PARTICIPANTS } from "./participants/sakana.js";
import { PRISMML_PARTICIPANTS } from "./participants/prismml.js";
import { UNBIASED_PARTICIPANTS } from "./participants/unbiased.js";
import { NEXAGI_PARTICIPANTS } from "./participants/nexagi.js";
import { INCLUSIONAI_PARTICIPANTS } from "./participants/inclusionai.js";

/**
 * All AI participants, assembled from one file per provider under
 * ./participants/. Each file mirrors the matching provider config in
 * ai-chat-core/src/config/aiProviders/providers/, so a model is edited in two
 * places with the same name rather than one file and a 1400-line array.
 *
 * Emoji themes by provider:
 *   Anthropic    - Music/performing arts (model names are musical forms)
 *   OpenAI       - Space/cosmos
 *   xAI/Grok     - Gaming/arcade (playful brand personality)
 *   Google       - Gems/crystals ("Gemini" = precious)
 *   Cohere       - Naval/seafaring ("Command" naming)
 *   Mistral AI   - Wind/weather ("Mistral" is a cold wind)
 *   DeepSeek     - Deep ocean creatures
 *   Moonshot AI  - Moon phases
 *   Qwen         - East Asian culture
 *   Z.ai         - Tools/engineering
 *   Meta         - Mountain animals (llama habitat)
 *   Amazon       - Rainforest
 *   NVIDIA       - Green (brand color)
 *   Baidu        - Bears (logo mascot)
 *   ByteDance    - Seeds/plants ("Seed" product)
 *   Hugging Face - Warmth/hugs
 *   Perplexity   - Sonar/signal
 *   Nous Research - Greek/wisdom ("Nous" = mind)
 *   Microsoft AI - Magic/wizards
 *   Inception    - Quicksilver ("Mercury")
 *   Sakana AI    - Fish ("sakana" is Japanese for fish)
 *   PrismML      - Miniature plants ("Bonsai")
 *   Unbiased     - Balance ("Pareto" = the efficient tradeoff)
 *   Nex AGI      - Targets/aim (goal-to-outcome agents)
 *   InclusionAI  - Bells ("ling" is Chinese for bell)
 */
export const DEFAULT_AI_PARTICIPANTS: AiParticipant[] = [
  ...ANTHROPIC_PARTICIPANTS,
  ...OPENAI_PARTICIPANTS,
  ...GROK_PARTICIPANTS,
  ...GEMINI_PARTICIPANTS,
  ...COHERE_PARTICIPANTS,
  ...MISTRAL_PARTICIPANTS,
  ...DEEPSEEK_PARTICIPANTS,
  ...KIMI_PARTICIPANTS,
  ...QWEN_PARTICIPANTS,
  ...ZAI_PARTICIPANTS,
  ...META_PARTICIPANTS,
  ...AMAZON_PARTICIPANTS,
  ...NVIDIA_PARTICIPANTS,
  ...MINIMAX_PARTICIPANTS,
  ...BYTEDANCE_PARTICIPANTS,
  ...HUGGINGFACE_PARTICIPANTS,
  ...INFLECTION_PARTICIPANTS,
  ...ZEROONE_PARTICIPANTS,
  ...DATABRICKS_PARTICIPANTS,
  ...NOUS_PARTICIPANTS,
  ...PHIND_PARTICIPANTS,
  ...MICROSOFT_PARTICIPANTS,
  ...SNOWFLAKE_PARTICIPANTS,
  ...PERPLEXITY_PARTICIPANTS,
  ...XIAOMI_PARTICIPANTS,
  ...BAIDU_PARTICIPANTS,
  ...ARCEE_PARTICIPANTS,
  ...STEPFUN_PARTICIPANTS,
  ...INCEPTION_PARTICIPANTS,
  ...SAKANA_PARTICIPANTS,
  ...PRISMML_PARTICIPANTS,
  ...UNBIASED_PARTICIPANTS,
  ...NEXAGI_PARTICIPANTS,
  ...INCLUSIONAI_PARTICIPANTS,
];

/**
 * Get participant by ID
 */
export const getParticipantById = (id: string): AiParticipant | undefined =>
  DEFAULT_AI_PARTICIPANTS.find((p) => p.id === id);

/**
 * Get participant by alias
 */
export const getParticipantByAlias = (
  alias: string,
): AiParticipant | undefined =>
  DEFAULT_AI_PARTICIPANTS.find(
    (p) => p.alias.toLowerCase() === alias.toLowerCase(),
  );

/**
 * Get all active participants
 */
export const getActiveParticipants = (): AiParticipant[] =>
  DEFAULT_AI_PARTICIPANTS.filter((p) => p.status === "active");

/**
 * Get participants by provider
 */
export const getParticipantsByProvider = (provider: string): AiParticipant[] =>
  DEFAULT_AI_PARTICIPANTS.filter(
    (p) => p.provider.toLowerCase() === provider.toLowerCase(),
  );

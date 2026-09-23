import { DEFAULT_AI_PARTICIPANTS } from "./participants.js";
import { normalizeAliasKey } from "./aliasUtils.js";

/**
 * Normalize an alias string for lookup
 */
export const normalizeAlias = (alias: string): string =>
  alias.toLowerCase().trim().replace(/\s+/g, "-");

/**
 * Mention mappings from various aliases to canonical names.
 * Used to resolve user mentions to standardized AI identifiers.
 */
export const AI_MENTION_MAPPINGS: Record<string, string> = {
  "claude-opus-5-5": "claude-opus-5-5",
  "claude-opus-5.5": "claude-opus-5-5",
  "claude-opus-5": "claude-opus-5",
  "claude-sonnet-5": "claude-sonnet-5",
  "gpt-6-astra": "gpt-6-astra",
  "gpt-6": "gpt-6-astra",
  astra: "gpt-6-astra",
  // GPT-5.6 Sol/Luna are parked; their names resolve to the GPT-6 models that replaced them
  "gpt-6-sol": "gpt-6-sol",
  "gpt-6-luna": "gpt-6-luna",
  "gpt-5.6": "gpt-5.6-terra",
  "gpt-5.6-sol": "gpt-6-sol",
  "gpt-5.6-luna": "gpt-6-luna",
  sol: "gpt-6-sol",
  terra: "gpt-5.6-terra",
  luna: "gpt-6-luna",
  "gemini-3.8": "gemini-3.8-flash",
  "gemini-3.7": "gemini-3.7-flash",
  "gemini-3.6": "gemini-3.6-flash",
  "grok-4.7": "grok-4.7",
  "grok-4.6": "grok-4.6",
  "grok-4.5": "grok-4.5",
  "glm-5.3": "glm-5.3",
  "glm-5.2": "glm-5.2",
  "kimi-k3": "kimi-k3",
  "qwen3.8": "qwen3.8-max",
  "qwen3.8-omni": "qwen3.8-omni-flash",
  "qwen3.8-omni-flash": "qwen3.8-omni-flash",
  "qwen3.7": "qwen3.7-max",
  "command-a-plus": "command-a-plus",
  xiaomi: "mimo-v2.6-pro",
  mimo: "mimo-v2.6-pro",
  "mimo-v2.6": "mimo-v2.6-pro",
  baidu: "ernie-4.5-vl",
  ernie: "ernie-4.5-vl",
  arcee: "trinity-large-thinking",
  trinity: "trinity-large-thinking",
  phi: "phi-4",
  // Anthropic/Claude
  // Bare aliases follow Anthropic's recommended default, now Opus 5.5; Fable 5.1 costs 2.5x.
  claude: "claude-opus-5-5",
  anthropic: "claude-opus-5-5",
  haiku: "claude-haiku-4-5",
  sonnet: "claude-sonnet-5",
  opus: "claude-opus-5-5",
  fable: "claude-fable-5-1",
  "claude-fable": "claude-fable-5-1",
  "claude-fable-5-1": "claude-fable-5-1",
  "claude-fable-5.1": "claude-fable-5-1",
  "claude-opus-4-8": "claude-opus-4-8",
  "claude-opus-4-7": "claude-opus-4-7",
  "claude-opus-4-6": "claude-opus-4-6",
  "claude-haiku-4-5": "claude-haiku-4-5",
  "claude-sonnet-4-5": "claude-sonnet-4-5",
  "claude-opus-4-1": "claude-opus-4-1",

  // OpenAI/GPT
  gpt: "gpt-6-astra",
  "gpt-5.5": "gpt-5.5",
  "gpt-5.5-pro": "gpt-5.5-pro",
  gpt4: "gpt-4o",
  "gpt-4": "gpt-4o",
  "gpt-4o": "gpt-4o",
  "gpt-4o-mini": "gpt-4o-mini",
  "gpt-4.1": "gpt-4.1",
  "gpt-4.1-mini": "gpt-4.1-mini",
  "gpt-4.1-nano": "gpt-4.1-nano",
  openai: "gpt-6-astra",
  chatgpt: "gpt-6-astra",
  "chatgpt-5-mini": "gpt-5-mini",
  "chatgpt-5.1-mini": "gpt-5-mini",
  "gpt-5.2": "gpt-5.2",
  "gpt-5.2-pro": "gpt-5.2-pro",
  "gpt-5-mini": "gpt-5-mini",
  "gpt-5-nano": "gpt-5-nano",
  "gpt-5.1-mini": "gpt-5-mini",
  o3: "o3",
  "o4-mini": "o4-mini",

  // xAI/Grok
  grok: "grok-4.7",
  xai: "grok-4.7",
  "grok-4.3": "grok-4.3",
  "grok-4.20": "grok-4.20",
  "grok-4.20-reasoning": "grok-4.20-reasoning",
  "grok-4.20-multi-agent": "grok-4.20-multi-agent",

  // Google/Gemini
  gemini: "gemini-3.8-flash",
  "gemini-3.5": "gemini-3.5-flash",
  "gemini-3.5-flash": "gemini-3.5-flash",
  gemini3: "gemini-3.1-pro",
  "gemini-3": "gemini-3.1-pro",
  "gemini 3": "gemini-3.1-pro",
  "gemini-3.1": "gemini-3.1-pro",
  "gemini 3.1": "gemini-3.1-pro",
  "gemini-3.1-pro": "gemini-3.1-pro",
  "gemini-3.1-flash": "gemini-3.1-flash",
  "gemini-3.1-flash-lite": "gemini-3.1-flash-lite",
  "gemini-flash": "gemini-3.1-flash",
  "gemini-2.5": "gemini-2.5-pro",
  google: "gemini-3.8-flash",
  bard: "gemini-3.8-flash",

  // Cohere
  command: "cohere",
  commandr: "cohere",
  cohere: "cohere",
  "cohere-reasoning": "cohere-reasoning",
  "cohere-translate": "cohere-translate",
  "command-r-plus": "command-r-plus",
  "command-r": "command-r",

  // Mistral AI
  mistral: "mistral",
  "mistral-medium": "mistral-medium",
  "mistral-small": "mistral-small",
  "magistral-small": "magistral-small",
  "magistral-medium": "magistral-medium",
  codestral: "codestral",
  "devstral-small": "devstral-small",
  "ministral-8b": "ministral-8b",

  // DeepSeek: older names point at V4.1 Flash, which DeepSeek now serves in their place
  deepseek: "deepseek-v4.1-flash",
  "deepseek-flash": "deepseek-v4.1-flash",
  "deepseek-v4.1": "deepseek-v4.1-flash",
  "deepseek-v4": "deepseek-v4.1-flash",
  "deepseek-v4-pro": "deepseek-v4.1-flash",
  "deepseek-v4-flash": "deepseek-v4.1-flash",
  "deepseek-v3": "deepseek-v4.1-flash",
  "deepseek-v3.2": "deepseek-v4.1-flash",
  "deepseek-chat": "deepseek-v4.1-flash",
  "deepseek-r1": "deepseek-v4.1-flash",

  // Moonshot/Kimi
  kimi: "kimi-k3",
  "kimi-k2.6": "kimi-k2.6",
  "kimi-k2.6-thinking": "kimi-k2.6-thinking",
  "kimi-k2.5": "kimi-k2.5",
  "kimi-k2": "kimi-k2.6",
  "kimi-latest": "kimi-latest",
  "kimi-thinking": "kimi-thinking-preview",
  "kimi-thinking-preview": "kimi-thinking-preview",
  moonshot: "kimi-k3",

  // Z.ai
  "z.ai": "z.ai",
  z: "z.ai",
  zai: "z.ai",
  "glm-5.1": "glm-5.1",
  "glm-5": "glm-5",
  "glm-4.5": "glm-4.5",
  "glm-4.5-air": "glm-4.5-air",
  "glm-4.6": "glm-4.6",
  "glm-4.6v": "glm-4.6v",
  "glm-4.7": "glm-4.7",
  "glm-5.3-flashx": "glm-5.3-flashx",
  flashx: "glm-5.3-flashx",
  "glm-4.7-flash": "glm-4.7-flash",
  "glm-4.7v": "glm-4.7v",
  "glm-4.5-airx": "glm-4.5-airx",
  "glm-4.5-flash": "glm-4.5-flash",
  "glm-4.5-long": "glm-4.5-long",

  // Perplexity
  perplexity: "sonar-pro",
  pplx: "sonar-pro",
  sonar: "sonar",
  "sonar-pro": "sonar-pro",
  "sonar-reasoning-pro": "sonar-reasoning-pro",
  "sonar-research": "sonar-deep-research",
  "sonar-deep-research": "sonar-deep-research",

  // Qwen/Alibaba
  qwen: "qwen3.8-max",
  alibaba: "qwen3.8-max",
  "qwen3.6": "qwen3.6-max",
  "qwen3.6-max": "qwen3.6-max",
  "qwen-turbo": "qwen-turbo",
  "qwen-plus": "qwen-plus",
  qwen3: "qwen3-max",
  "qwen3-max": "qwen3-max",
  "qwen3-235b": "qwen3-235b",
  "qwen3-coder": "qwen3-coder-plus",

  // Meta (Llama via Llama API, Muse via OpenRouter)
  llama: "llama-3.3-70b",
  meta: "muse-spark-1.3",
  muse: "muse-spark-1.3",
  "muse-spark": "muse-spark-1.3",
  "llama-3.3-70b": "llama-3.3-70b",
  "llama-3.3-70b-free": "llama-3.3-70b-free",
  "llama-4-maverick": "llama-4-maverick",
  "llama-4-scout": "llama-4-scout",

  // Amazon (OpenRouter)
  amazon: "nova-pro",
  nova: "nova-pro",
  "nova-pro": "nova-pro",
  "nova-2-lite": "nova-2-lite",

  // NVIDIA (OpenRouter)
  nvidia: "nemotron-3-ultra",
  nemotron: "nemotron-3-ultra",
  "nemotron-3.5": "nemotron-3.5-lightning",
  "nemotron-3-nano-30b-a3b": "nemotron-3-nano-30b-a3b",
  "nemotron-3-nano-30b-a3b-free": "nemotron-3-nano-30b-a3b-free",

  // Xiaomi (OpenRouter)
  "mimo-v2.6-pro": "mimo-v2.6-pro",
  "mimo-v2.6-flash": "mimo-v2.6-flash",
  "mimo-v2.5": "mimo-v2.5",

  // MiniMax (OpenRouter)
  minimax: "minimax-m3",
  "minimax-m2.1": "minimax-m2.1",
  "minimax-m2": "minimax-m2",
  "minimax-m1": "minimax-m1",

  // Baidu (OpenRouter)

  // ByteDance (OpenRouter)
  bytedance: "seed-2.1-turbo",
  seed: "seed-2.1-turbo",
  "seed-2.1": "seed-2.1-turbo",
  "seed-2.0-mini": "seed-2.0-mini",
  "seed-1.6-flash": "seed-1.6-flash",
  "seed-1.6": "seed-1.6",

  // Hugging Face (OpenRouter)

  // Arcee AI (OpenRouter)

  // StepFun (OpenRouter)
  stepfun: "step-3.7-flash",

  // Inflection AI (OpenRouter)

  // 01.AI (OpenRouter)

  // Databricks (OpenRouter)

  // Nous Research (OpenRouter)
  nous: "hermes-4-405b",
  hermes: "hermes-4-405b",

  // Phind (OpenRouter)

  // Microsoft AI (OpenRouter)
  microsoft: "wizardlm-2-8x22b",
  wizardlm: "wizardlm-2-8x22b",
  "wizardlm-2-8x22b": "wizardlm-2-8x22b",
  "wizardlm-2-7b": "wizardlm-2-7b",

  // Snowflake (OpenRouter)

  // Inception (OpenRouter)
  inception: "mercury-2.5",
  mercury: "mercury-2.5",

  // PrismML (OpenRouter)
  prismml: "ternary-bonsai-2-27b",
  bonsai: "ternary-bonsai-2-27b",
  "ternary-bonsai": "ternary-bonsai-2-27b",

  // Unbiased (OpenRouter)
  unbiased: "pareto",
  pareto: "pareto",

  // Nex AGI (OpenRouter)
  nex: "nex-n2.5-pro",
  "nex-agi": "nex-n2.5-pro",
  "nex-n2.5": "nex-n2.5-pro",

  // InclusionAI (OpenRouter)
  inclusionai: "ling-3.0-flash-vl",
  ling: "ling-3.0-flash-vl",
  "ling-3.0": "ling-3.0-flash-vl",

  // Sakana AI (OpenRouter)
  sakana: "fugu-ultra-v2",
  fugu: "fugu-ultra-v2",
  "fugu-ultra": "fugu-ultra-v2",
  "fugu-max": "fugu-max",
};

const buildEmojiLookup = (): Record<string, string> => {
  const lookup: Record<string, string> = {};
  const emojiByAlias = new Map(
    DEFAULT_AI_PARTICIPANTS.map((participant) => [
      normalizeAlias(participant.alias),
      participant.emoji,
    ]),
  );
  const emojiAliasOverrides = new Map<string, string>([
    ["perplexity", "sonar"],
    ["pplx", "sonar"],
    ["qwen", "qwen3-max"], // 🐲
    // Base provider aliases -> specific model with expected emoji
    ["kimi", "kimi-k2.5"], // 🌕
    ["moonshot", "kimi-k2.5"],
  ]);

  const addEntry = (key: string, canonicalAlias: string) => {
    const emoji = emojiByAlias.get(normalizeAlias(canonicalAlias));
    if (emoji) {
      lookup[normalizeAlias(key)] = emoji;
    }
  };

  for (const [alias, canonical] of Object.entries(AI_MENTION_MAPPINGS)) {
    addEntry(alias, canonical);
  }

  for (const participant of DEFAULT_AI_PARTICIPANTS) {
    lookup[normalizeAlias(participant.alias)] = participant.emoji;
  }

  for (const [alias, canonical] of emojiAliasOverrides.entries()) {
    addEntry(alias, canonical);
  }

  return lookup;
};

/**
 * Emoji lookup by normalized alias/provider name.
 * Used for quick emoji resolution from user mentions.
 */
export const AI_EMOJI_LOOKUP: Record<string, string> = buildEmojiLookup();

/**
 * Resolve emoji from alias
 */
export const resolveEmoji = (alias: string): string => {
  const normalized = normalizeAlias(alias);

  const directMatch = AI_EMOJI_LOOKUP[normalized];
  if (directMatch) return directMatch;

  const aliasKey = Object.keys(AI_EMOJI_LOOKUP).find((key) =>
    normalized.includes(key),
  );
  return aliasKey ? AI_EMOJI_LOOKUP[aliasKey] : "🤖";
};

/**
 * Map mentions to canonical AI names
 */
export const mapMentionsToAiNames = (text: string): string => {
  const mentionRegex = /@(\S+)/g;
  return text.replace(mentionRegex, (_, mention) => {
    const normalized = normalizeAlias(mention);
    return `@${AI_MENTION_MAPPINGS[normalized] || mention}`;
  });
};

// Strict-normalized mapping keys so tokens with stray punctuation
// ("chatgpt," / "GPT-4!") still resolve. First mapping wins on collisions.
const STRICT_MENTION_LOOKUP: Record<string, string> = Object.entries(
  AI_MENTION_MAPPINGS,
).reduce(
  (lookup, [key, value]) => {
    const strictKey = normalizeAliasKey(key);
    if (strictKey && !(strictKey in lookup)) {
      lookup[strictKey] = value;
    }
    return lookup;
  },
  {} as Record<string, string>,
);

/**
 * Resolve a single mention token (without the "@") to its canonical
 * participant alias via AI_MENTION_MAPPINGS, e.g. "chatgpt" -> "gpt-5.5".
 * Returns the token unchanged when no mapping exists, so exact aliases
 * and usernames pass through.
 */
export const resolveMentionTarget = (token: string): string =>
  AI_MENTION_MAPPINGS[normalizeAlias(token)] ??
  STRICT_MENTION_LOOKUP[normalizeAliasKey(token)] ??
  token;

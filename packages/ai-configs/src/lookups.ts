import { DEFAULT_AI_PARTICIPANTS } from "./participants.js";

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
  // Anthropic/Claude
  claude: "claude-sonnet-4-5",
  anthropic: "claude-sonnet-4-5",
  haiku: "claude-haiku-4-5",
  sonnet: "claude-sonnet-4-5",
  opus: "claude-opus-4-6",
  "claude-opus-4-6": "claude-opus-4-6",
  "claude-3-7-sonnet": "claude-3-7-sonnet",
  "claude-3-5-haiku": "haiku-3-5",
  "claude-haiku-4-5": "claude-haiku-4-5",
  "claude-sonnet-4": "claude-sonnet-4",
  "claude-sonnet-4-5": "claude-sonnet-4-5",
  "claude-opus-4": "claude-opus-4",
  "opus-4-5": "opus-4-5",
  "claude-opus-4-5": "opus-4-5",
  "claude-opus-4-1": "claude-opus-4-1",

  // OpenAI/GPT
  gpt: "gpt-5.2",
  gpt4: "gpt-4o",
  "gpt-4": "gpt-4o",
  "gpt-4o": "gpt-4o",
  "gpt-4o-mini": "gpt-4o-mini",
  "gpt-4.1": "gpt-4.1",
  "gpt-4.1-mini": "gpt-4.1-mini",
  "gpt-4.1-nano": "gpt-4.1-nano",
  gpt35: "gpt-3-5",
  "gpt-3.5-turbo": "gpt-3-5",
  "gpt-3-5": "gpt-3-5",
  openai: "gpt-5.2",
  chatgpt: "gpt-5.2",
  "chatgpt-5-mini": "gpt-5-mini",
  "chatgpt-5.1-mini": "gpt-5-mini",
  "gpt-5": "gpt-5",
  "gpt-5.1": "gpt-5.1",
  "gpt-5.2": "gpt-5.2",
  "gpt-5.2-pro": "gpt-5.2-pro",
  "gpt-5-mini": "gpt-5-mini",
  "gpt-5-nano": "gpt-5-nano",
  "gpt-5.1-mini": "gpt-5-mini",
  o3: "o3",
  "o4-mini": "o4-mini",

  // xAI/Grok
  grok: "grok",
  xai: "grok",
  "grok-3-mini": "grok-3-mini",
  "grok-4": "grok-4",
  "grok-4-fast": "grok-4-fast",
  "grok-4-reasoning": "grok-4-reasoning",
  "grok-4-heavy": "grok-4-heavy",
  "grok-4.1": "grok-4.1-fast",
  "grok-4.1-fast": "grok-4.1-fast",
  "grok-4.1-reasoning": "grok-4.1-reasoning",
  "grok-code": "grok-code",

  // Google/Gemini
  gemini: "gemini-3-pro",
  gemini3: "gemini-3-pro",
  "gemini-3": "gemini-3-pro",
  "gemini 3": "gemini-3-pro",
  "gemini 3.0": "gemini-3-pro",
  "gemini-flash": "gemini-3-flash",
  "gemini-2.5": "gemini-2.5-pro",
  google: "gemini-3-pro",
  bard: "gemini-3-pro",

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

  // DeepSeek
  deepseek: "deepseek",
  "deepseek-v3": "deepseek",
  "deepseek-v3.2": "deepseek",
  "deepseek-r1": "deepseek-r1",

  // Moonshot/Kimi
  kimi: "kimi-k2.5",
  "kimi-k2.5": "kimi-k2.5",
  "kimi-k2": "kimi-k2.5",
  "kimi-8k": "moonshot-v1-8k",
  "kimi-latest": "kimi-latest",
  "kimi-thinking": "kimi-thinking-preview",
  "kimi-thinking-preview": "kimi-thinking-preview",
  moonshot: "kimi-k2.5",
  "moonshot-8k": "moonshot-v1-8k",
  "moonshot-32k": "moonshot-v1-32k",
  "moonshot-128k": "moonshot-v1-128k",

  // Z.ai
  "z.ai": "z.ai",
  z: "z.ai",
  zai: "z.ai",
  "glm-4.5": "glm-4.5",
  "glm-4.5-air": "glm-4.5-air",
  "glm-4.6": "glm-4.6",
  "glm-4.6v": "glm-4.6v",
  "glm-4.7": "glm-4.7",
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
  qwen: "qwen3-max",
  alibaba: "qwen3-max",
  "qwen-turbo": "qwen-turbo",
  "qwen-plus": "qwen-plus",
  "qwen-max": "qwen-max",
  qwen3: "qwen3-max",
  "qwen3-max": "qwen3-max",
  "qwen3-235b": "qwen3-235b",
  "qwen3-coder": "qwen3-coder-plus",
  "qwen-2.5-turbo": "qwen-2.5-turbo",
  "qwen-2.5-plus": "qwen-2.5-plus",
  "qwen-coder": "qwen-coder",

  // Meta/Llama (OpenRouter)
  llama: "llama-3.3-70b",
  meta: "llama-3.3-70b",
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
  nvidia: "nemotron-3-nano-30b-a3b",
  nemotron: "nemotron-3-nano-30b-a3b",
  "nemotron-3-nano-30b-a3b": "nemotron-3-nano-30b-a3b",
  "nemotron-3-nano-30b-a3b-free": "nemotron-3-nano-30b-a3b-free",
  "nemotron-3-nano-2-vl": "nemotron-3-nano-2-vl",

  // Xiaomi (OpenRouter)
  xiaomi: "mimo-v2-flash",
  mimo: "mimo-v2-flash",
  "mimo-v2-flash": "mimo-v2-flash",

  // MiniMax (OpenRouter)
  minimax: "minimax-m2.1",
  "minimax-m2.1": "minimax-m2.1",
  "minimax-m2": "minimax-m2",
  "minimax-m1": "minimax-m1",

  // Baidu (OpenRouter)
  baidu: "ernie-4.5-21b",
  ernie: "ernie-4.5-21b",
  "ernie-4.5-21b-thinking": "ernie-4.5-21b-thinking",
  "ernie-4.5-21b": "ernie-4.5-21b",
  "ernie-4.5-300b": "ernie-4.5-300b",

  // ByteDance (OpenRouter)
  bytedance: "seed-1.6",
  seed: "seed-1.6",
  "seed-1.6-flash": "seed-1.6-flash",
  "seed-1.6": "seed-1.6",

  // Hugging Face (OpenRouter)
  huggingface: "zephyr-141b",
  "hugging-face": "zephyr-141b",
  zephyr: "zephyr-141b",
  "zephyr-141b": "zephyr-141b",
  "zephyr-7b-beta": "zephyr-7b-beta",
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
    ["gemini", "gemini-3-pro"], // 🔷
    ["google", "gemini-3-pro"],
    ["bard", "gemini-3-pro"],
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

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
  sonnet: "claude-sonnet-4",
  opus: "claude-opus-4",
  "claude-3-7-sonnet": "claude-3-7-sonnet",
  "claude-3-5-haiku": "claude-3-5-haiku",
  "claude-haiku-4-5": "claude-haiku-4-5",
  "claude-sonnet-4": "claude-sonnet-4",
  "claude-sonnet-4-5": "claude-sonnet-4-5",
  "claude-opus-4": "claude-opus-4",
  "opus-4-5": "opus-4-5",
  "claude-opus-4-1": "claude-opus-4-1",

  // OpenAI/GPT
  gpt: "gpt-4o",
  gpt4: "gpt-4o",
  "gpt-4": "gpt-4o",
  "gpt-4o": "gpt-4o",
  "gpt-4.1": "gpt-4.1",
  gpt35: "gpt-3-5",
  "gpt-3.5-turbo": "gpt-3-5",
  "gpt-3-5": "gpt-3-5",
  openai: "gpt-4o",
  chatgpt: "gpt-5.1",
  "gpt-5": "gpt-5",
  "gpt-5.1": "gpt-5.1",
  "gpt-5.1-mini": "gpt-5.1-mini",
  "gpt-5.2": "gpt-5.2",
  o3: "o3",
  "o3-mini": "o3-mini",
  "o4-mini": "o4-mini",

  // xAI/Grok
  grok: "grok",
  xai: "grok",
  "grok-3-mini": "grok-3-mini",
  "grok-4": "grok-4",
  "grok-4-fast": "grok-4-fast",
  "grok-4-reasoning": "grok-4-reasoning",
  "grok-4-heavy": "grok-4-heavy",
  "grok-code": "grok-code",

  // Google/Gemini
  gemini: "gemini",
  gemini3: "gemini-3",
  "gemini-3": "gemini-3",
  "gemini 3": "gemini-3",
  "gemini 3.0": "gemini-3",
  "gemini-flash": "gemini-flash",
  "gemini-2.5": "gemini-2.5",
  google: "gemini",
  bard: "gemini",

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
  "ministral-8b": "ministral-8b",

  // DeepSeek
  deepseek: "deepseek",
  "deepseek-v3": "deepseek-v3",
  "deepseek-v3.2": "deepseek-v3.2",
  "deepseek-r1": "deepseek-r1",

  // Moonshot/Kimi
  kimi: "kimi-k2.5",
  "kimi-8k": "kimi-8k",
  "kimi-k2": "kimi-k2",
  "kimi-k2-thinking": "kimi-k2-thinking",
  "kimi-k2.5": "kimi-k2.5",
  moonshot: "kimi-k2.5",

  // Z.ai
  "z.ai": "z.ai",
  z: "z.ai",
  zai: "z.ai",
  "glm-4.5": "glm-4.5",
  "glm-4.5-air": "glm-4.5-air",
  "glm-4.6": "glm-4.6",
  "glm-4.7": "glm-4.7",
  "glm-4.7-flash": "glm-4.7-flash",

  // Perplexity
  perplexity: "sonar-pro",
  pplx: "sonar-pro",
  sonar: "sonar",
  "sonar-pro": "sonar-pro",
  "sonar-reasoning-pro": "sonar-reasoning-pro",
  "sonar-research": "sonar-research",
  "sonar-deep-research": "sonar-research",

  // Qwen/Alibaba
  qwen: "qwen-turbo",
  alibaba: "qwen-turbo",
  "qwen-turbo": "qwen-turbo",
  "qwen-plus": "qwen-plus",
  "qwen-max": "qwen-max",
  "qwen-2.5-turbo": "qwen-2.5-turbo",
  "qwen-2.5-plus": "qwen-2.5-plus",
  "qwen-coder": "qwen-coder",
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
    ["qwen", "qwen-turbo"],
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

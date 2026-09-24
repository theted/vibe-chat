import { DEFAULT_AI_PARTICIPANTS } from "./participants.js";
import { AI_MENTION_MAPPINGS } from "./mentionMappings.js";
import { normalizeAliasKey } from "./aliasUtils.js";

/**
 * Mention resolution: turning what a user typed into a participant, an emoji or
 * a canonical alias. The alias table itself is data and lives in
 * ./mentionMappings.js; it is re-exported here so this module stays the single
 * import path for both.
 */
export { AI_MENTION_MAPPINGS };

/**
 * Normalize an alias string for lookup
 */
export const normalizeAlias = (alias: string): string =>
  alias.toLowerCase().trim().replace(/\s+/g, "-");

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

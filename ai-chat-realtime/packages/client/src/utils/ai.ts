import { AI_EMOJI_LOOKUP, AI_MENTION_MAPPINGS } from "@/constants/chat.ts";

export const normalizeAlias = (value?: string | number | null): string => {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = value.toString();
  if (!stringValue) {
    return "";
  }

  return stringValue.toLowerCase().replace(/[^a-z0-9]/g, "");
};

export const resolveEmoji = (value?: string | number | null): string => {
  const normalized = normalizeAlias(value);
  if (!normalized) {
    return "🤖";
  }

  const directMatch = AI_EMOJI_LOOKUP[normalized];
  if (directMatch) {
    return directMatch;
  }

  const aliasKey = Object.keys(AI_EMOJI_LOOKUP)
    .sort((a, b) => b.length - a.length) // Prioritize longer keys
    .find((key) => normalized.startsWith(key));
  return aliasKey ? AI_EMOJI_LOOKUP[aliasKey] : "🤖";
};

export const mapMentionsToAiNames = (
  mentions: Array<string | number | boolean | null | undefined> = []
): string[] =>
  mentions
    .map((mention) => {
      const normalized = mention?.toLowerCase?.();
      if (!normalized) {
        return mention;
      }
      return AI_MENTION_MAPPINGS[normalized] || mention;
    })
    .filter((name, index, arr) => arr.indexOf(name) === index);

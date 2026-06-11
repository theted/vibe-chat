/**
 * Client-side AI helpers. Components should import shared-package helpers
 * (normalizeAliasKey & friends) through this module, not from
 * @ai-chat/ai-configs directly, so the client has one wrapper to adjust.
 *
 * Note: resolveEmoji here deliberately differs from the @ai-chat/ai-configs
 * version — the client variant does prefix matching over the UI emoji
 * lookup, while the shared version does substring matching.
 */
import { normalizeAliasKey } from "@ai-chat/ai-configs";
import { AI_EMOJI_LOOKUP } from "@/constants/chat.ts";

export { normalizeAliasKey };

export const normalizeAlias = normalizeAliasKey;

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

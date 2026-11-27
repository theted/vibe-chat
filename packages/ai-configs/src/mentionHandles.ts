/**
 * Mention handles and "did you mean" suggestions.
 *
 * A handle is what goes after "@": the hyphenated form of a participant alias
 * (`gpt-6.2-astra` -> `gpt-6-2-astra`). Routing already compares mentions
 * loosely (normalizeAliasKey drops case, dots, underscores and hyphens), so
 * `@GPT_6.2-astra` reaches the same model. What loose matching can't catch is
 * a near miss such as `@gpt-6-2-astr`; these helpers find the one handle such
 * a token most likely meant, and refuse to guess when several fit equally well.
 */

import { normalizeAliasKey } from "./aliasUtils.js";
import { isKnownMentionAlias, resolveMentionTarget } from "./lookups.js";

/** Below this many letters/digits a token is too short to guess from. */
export const MENTION_SUGGESTION_MIN_KEY_LENGTH = 4;
/** Keys at least this long may be off by two edits; shorter ones by one. */
export const MENTION_SUGGESTION_LONG_KEY_LENGTH = 8;
const SHORT_KEY_MAX_EDITS = 1;
const LONG_KEY_MAX_EDITS = 2;

// Same token shape as the server's parser (ai-chat-core createMentionTokenRegex)
const MENTION_TOKEN_REGEX = /@([^\s@]+)/g;
// An @ glued to these is an email or URL path, not a mention
const URL_OR_EMAIL_CHAR_REGEX = /[\w./%+=-]/;
const TRAILING_PUNCTUATION_REGEX = /[.,!?;:'")\]}]+$/;

export interface MentionSuggestion {
  /** The token as written, without "@" or trailing punctuation. */
  token: string;
  /** The handle it most likely meant, without "@". */
  suggestion: string;
}

/**
 * Hyphenated mention handle for an alias or name: lowercase, every run of
 * other characters (dots, spaces, underscores) collapsed to one hyphen.
 */
export const toMentionHandle = (
  value?: string | null,
  fallback = "",
): string => {
  const base = value?.trim() ? value : fallback;
  if (!base) return "";
  return base
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

/** Levenshtein distance, giving up (returning limit + 1) beyond `limit`. */
export const getEditDistance = (a: string, b: string, limit = Infinity) => {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, substitution);
    }
    if (Math.min(...current) > limit) return limit + 1;
    previous = current;
  }
  return previous[b.length];
};

const maxEditsFor = (key: string) =>
  key.length >= MENTION_SUGGESTION_LONG_KEY_LENGTH
    ? LONG_KEY_MAX_EDITS
    : SHORT_KEY_MAX_EDITS;

/** Strict key a mention token routes by, after alias resolution. */
const toRoutingKey = (token: string) =>
  normalizeAliasKey(resolveMentionTarget(token));

/**
 * The handle a mention token most likely meant, or null when the token
 * already resolves to one of `handles` (loosely: case, dots, underscores and
 * hyphens don't matter), is a known alias (AI_MENTION_MAPPINGS, which names
 * a model on purpose, even a parked one), is too short to guess from, is not
 * close to any handle, or is equally close to several (never guess).
 */
export const suggestMentionHandle = (
  token: string,
  handles: readonly string[],
): string | null => {
  const tokenKey = normalizeAliasKey(token);
  if (tokenKey.length < MENTION_SUGGESTION_MIN_KEY_LENGTH) return null;
  if (isKnownMentionAlias(token)) return null;

  const routingKey = toRoutingKey(token);
  const keyed = handles
    .map((handle) => ({ handle, key: normalizeAliasKey(handle) }))
    .filter(({ key }) => key);
  if (keyed.some(({ key }) => key === routingKey || key === tokenKey)) {
    return null;
  }

  const maxEdits = maxEditsFor(tokenKey);
  let best: string | null = null;
  let bestDistance = maxEdits + 1;
  let isTied = false;
  const seenKeys = new Set<string>();
  for (const { handle, key } of keyed) {
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    const distance = getEditDistance(tokenKey, key, maxEdits);
    if (distance < bestDistance) {
      best = handle;
      bestDistance = distance;
      isTied = false;
    } else if (distance === bestDistance) {
      isTied = true;
    }
  }
  return best && !isTied ? best : null;
};

/**
 * Near-miss @mentions in a text, each with the handle it most likely meant
 * (see suggestMentionHandle). Each token is reported once.
 */
export const findMentionSuggestions = (
  text: string,
  handles: readonly string[],
): MentionSuggestion[] => {
  if (!text?.includes("@")) return [];
  const suggestions: MentionSuggestion[] = [];
  const seenTokens = new Set<string>();

  for (const match of text.matchAll(MENTION_TOKEN_REGEX)) {
    const previousChar = text[(match.index ?? 0) - 1];
    if (previousChar && URL_OR_EMAIL_CHAR_REGEX.test(previousChar)) continue;
    const token = match[1].replace(TRAILING_PUNCTUATION_REGEX, "");
    if (!token || seenTokens.has(token)) continue;
    seenTokens.add(token);
    const suggestion = suggestMentionHandle(token, handles);
    if (suggestion) suggestions.push({ token, suggestion });
  }
  return suggestions;
};

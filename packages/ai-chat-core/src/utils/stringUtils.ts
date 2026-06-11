/**
 * String Utility Functions
 *
 * Common string manipulation functions used across the orchestrator and services.
 */

import {
  normalizeAliasKey,
  parseBooleanFlag,
  resolveMentionTarget,
} from "@ai-chat/ai-configs";

/**
 * Normalize an alias/name to lowercase alphanumeric characters only
 * Used for consistent comparison of participant names and mentions
 */
export const normalizeAlias = normalizeAliasKey;

/**
 * Convert a value to a mention-friendly alias format
 * Preserves hyphens but removes other special characters
 */
export const toMentionAlias = (
  value?: string | null,
  fallback = "",
): string => {
  const base = value && value.trim() ? value : fallback;
  if (!base) return "";
  return base
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

/**
 * Parse boolean from environment variable string
 * Returns true for: "1", "true", "yes", "on" (case insensitive)
 */
export const parseBooleanEnvFlag = (value?: string | null): boolean =>
  parseBooleanFlag(value);

/**
 * Safely get environment variable value
 */
export const getEnvFlag = (name: string): string | undefined => {
  if (typeof process === "undefined" || !process?.env) {
    return undefined;
  }
  return process.env[name];
};

/**
 * Single source of truth for the @mention token pattern.
 * Returns a fresh RegExp per call so callers never share lastIndex state.
 * Note: matches single-word tokens only; the client's display-name matcher
 * (client/src/utils/mentions.ts) intentionally has different semantics.
 */
export const createMentionTokenRegex = (): RegExp => /@([^\s@]+)/g;

/**
 * Parse @mentions from message content.
 * Returns raw mentions plus normalized targets: generic aliases are resolved
 * to canonical participant aliases first (e.g. "@chatgpt" -> "gpt55"), so
 * mention targeting works for the whole alias vocabulary, not just exact
 * participant aliases.
 */
export const parseMentions = (
  content = "",
): { mentions: string[]; normalized: string[] } => {
  const mentionRegex = createMentionTokenRegex();
  const mentions: string[] = [];
  const normalized: string[] = [];
  const seen = new Set<string>();

  let match;
  while ((match = mentionRegex.exec(content)) !== null) {
    const token = match[1];
    if (!token) continue;
    const normalizedToken = normalizeAlias(resolveMentionTarget(token));
    if (normalizedToken && !seen.has(normalizedToken)) {
      mentions.push(token);
      normalized.push(normalizedToken);
      seen.add(normalizedToken);
    }
  }

  return { mentions, normalized };
};

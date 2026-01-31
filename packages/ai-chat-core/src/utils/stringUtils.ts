/**
 * String Utility Functions
 *
 * Common string manipulation functions used across the orchestrator and services.
 */

/**
 * Normalize an alias/name to lowercase alphanumeric characters only
 * Used for consistent comparison of participant names and mentions
 */
export const normalizeAlias = (value?: string | number | null): string =>
  value
    ? value
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
    : "";

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
export const parseBooleanEnvFlag = (value?: string | null): boolean => {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return ["1", "true", "yes", "on"].includes(normalized);
};

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
 * Parse @mentions from message content
 * Returns both raw mentions and normalized versions
 */
export const parseMentions = (
  content = "",
): { mentions: string[]; normalized: string[] } => {
  const mentionRegex = /@([^\s@]+)/g;
  const mentions: string[] = [];
  const normalized: string[] = [];
  const seen = new Set<string>();

  let match;
  while ((match = mentionRegex.exec(content)) !== null) {
    const token = match[1];
    if (!token) continue;
    const normalizedToken = normalizeAlias(token);
    if (normalizedToken && !seen.has(normalizedToken)) {
      mentions.push(token);
      normalized.push(normalizedToken);
      seen.add(normalizedToken);
    }
  }

  return { mentions, normalized };
};

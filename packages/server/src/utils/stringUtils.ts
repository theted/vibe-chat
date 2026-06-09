/**
 * Shared string utility functions
 */

/**
 * Resolve a value to a trimmed string, falling back to the provided default
 */
export const resolveText = (value: unknown, fallback: string): string => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return fallback;
};

/**
 * Normalize an alias to lowercase alphanumeric characters only.
 * Re-exported from the shared implementation in @ai-chat/ai-configs.
 */
export { normalizeAliasKey as normalizeAlias } from "@ai-chat/ai-configs";

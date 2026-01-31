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
 * Normalize an alias to lowercase alphanumeric characters only
 */
export const normalizeAlias = (value?: string | number | null): string =>
  value
    ? value
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
    : "";

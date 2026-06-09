/**
 * Shared alias normalization utilities.
 *
 * Two normalization flavors exist in the app:
 *  - `normalizeAlias` (lookups.ts): lowercase + trim + spaces→hyphens,
 *    used for mention-mapping keys where hyphens are significant.
 *  - `normalizeAliasKey` (here): strict lowercase alphanumeric only,
 *    used for fuzzy comparison of participant names/aliases/mentions.
 *
 * `normalizeAliasKey` is the single source of truth for the strict variant —
 * core, server, and client all import it from here.
 */
export const normalizeAliasKey = (value?: string | number | null): string => {
  // explicit null check so numeric 0 normalizes to "0" rather than ""
  if (value === null || value === undefined) {
    return "";
  }
  return value
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
};

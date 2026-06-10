/**
 * Shared environment/flag parsing utilities.
 */

/**
 * Parse a boolean from a string flag value.
 * Accepts "1"/"true"/"yes"/"on" as true and "0"/"false"/"no"/"off" as false
 * (case insensitive); anything else returns `defaultValue`.
 */
export const parseBooleanFlag = (
  value?: string | null,
  defaultValue = false,
): boolean => {
  if (typeof value !== "string") {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return defaultValue;
  }

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return defaultValue;
};

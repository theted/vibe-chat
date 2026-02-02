/**
 * Re-export AI lookups from @ai-chat/ai-configs package.
 */
export { AI_EMOJI_LOOKUP, AI_MENTION_MAPPINGS } from "@ai-chat/ai-configs";

const resolveBooleanFlag = (
  value: string | undefined,
  defaultValue: boolean,
): boolean => {
  if (!value) {
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

const resolveServerUrl = (): string => {
  const envUrl = (import.meta.env.VITE_SERVER_URL || "").trim();
  if (envUrl) {
    return envUrl;
  }

  if (typeof window !== "undefined" && window.location) {
    const { protocol, hostname, port } = window.location;
    if (port === "3000") {
      const targetPort = import.meta.env.VITE_SERVER_PORT || "3001";
      return `${protocol}//${hostname}:${targetPort}`;
    }
    const portSegment = port ? `:${port}` : "";
    return `${protocol}//${hostname}${portSegment}`;
  }

  return "http://localhost:3001";
};

export const SERVER_URL = resolveServerUrl();
export const PRIVATE_CONVERSATIONS_ENABLED = resolveBooleanFlag(
  import.meta.env.VITE_PRIVATE_CONVERSATIONS_ENABLED,
  true,
);

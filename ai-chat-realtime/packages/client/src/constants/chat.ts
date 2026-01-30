/**
 * Re-export AI lookups from @ai-chat/ai-configs package.
 */
export { AI_EMOJI_LOOKUP, AI_MENTION_MAPPINGS } from "@ai-chat/ai-configs";

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

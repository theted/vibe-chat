import { CONTEXT_LIMITS } from "@/orchestrator/constants.js";

/**
 * Shorten a message for quoting inside prompt instructions.
 */
export const excerptForQuote = (
  text: string,
  maxLength: number = CONTEXT_LIMITS.QUOTE_EXCERPT_LENGTH,
): string => {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
};

export const truncateResponse = (response) => {
  if (response && typeof response === "object" && "content" in response) {
    response = response.content;
  }

  if (!response || typeof response !== "string") {
    return response;
  }

  const sentences = response
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim().length > 0);

  if (sentences.length <= CONTEXT_LIMITS.MAX_SENTENCES) {
    return response.trim();
  }

  let truncated = sentences
    .slice(0, CONTEXT_LIMITS.MAX_SENTENCES)
    .join(" ")
    .trim();

  if (!truncated.match(/[.!?]$/)) {
    truncated += ".";
  }

  return truncated;
};

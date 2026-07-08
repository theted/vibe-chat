import { CONTEXT_LIMITS } from "@/orchestrator/constants.js";
import type { ServiceResponse } from "@/types/index.js";

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

export const truncateResponse = (
  response: string | ServiceResponse | null | undefined,
): string => {
  const content =
    response && typeof response === "object" && "content" in response
      ? response.content
      : response;

  if (!content || typeof content !== "string") {
    return "";
  }

  const sentences = content
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim().length > 0);

  if (sentences.length <= CONTEXT_LIMITS.MAX_SENTENCES) {
    return content.trim();
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

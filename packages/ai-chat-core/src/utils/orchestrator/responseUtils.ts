import { CONTEXT_LIMITS } from "@/orchestrator/constants.js";

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

import { resolveMentionTarget } from "@ai-chat/ai-configs";
import { MENTION_LIMITS } from "@/orchestrator/constants.js";
import {
  createMentionTokenRegex,
  normalizeAlias,
  parseMentions,
} from "@/utils/stringUtils.js";

/**
 * Whether a response actually @mentions the given handle (as a mention
 * token, not just the bare name). Used for prompt-driven mention telemetry:
 * the MENTION_TARGET instruction lets the model skip forced mentions, and
 * this measures how often it follows through.
 */
export const responseIncludesMention = (
  response: string,
  mentionHandle: string,
): boolean => {
  const bareHandle = mentionHandle.startsWith("@")
    ? mentionHandle.slice(1)
    : mentionHandle;
  // Same alias-resolution pipeline parseMentions applies to response tokens,
  // so "@chatgpt" in the response matches a "@GPT" target and vice versa
  const normalizedTarget = normalizeAlias(resolveMentionTarget(bareHandle));
  if (!normalizedTarget) return false;

  return parseMentions(response).normalized.includes(normalizedTarget);
};

export const limitMentionsInResponse = (
  response = "",
  maxUniqueMentions: number = MENTION_LIMITS.MAX_UNIQUE_PER_RESPONSE,
): string => {
  if (!response || maxUniqueMentions < 1) {
    return response;
  }

  const seenMentions = new Set<string>();
  let uniqueCount = 0;

  return response.replace(createMentionTokenRegex(), (match, token: string) => {
    if (!token) {
      return match;
    }

    const normalizedToken = normalizeAlias(token);
    if (!normalizedToken) {
      return match;
    }

    if (seenMentions.has(normalizedToken)) {
      return match;
    }

    seenMentions.add(normalizedToken);
    uniqueCount += 1;

    if (uniqueCount > maxUniqueMentions) {
      return token;
    }

    return match;
  });
};

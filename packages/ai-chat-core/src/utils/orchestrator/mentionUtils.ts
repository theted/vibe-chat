import { MENTION_LIMITS } from "@/orchestrator/constants.js";
import {
  createMentionTokenRegex,
  normalizeAlias,
} from "@/utils/stringUtils.js";

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

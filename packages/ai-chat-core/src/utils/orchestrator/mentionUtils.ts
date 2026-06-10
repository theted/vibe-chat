import {
  MENTION_FORMATS,
  MENTION_LIMITS,
} from "@/orchestrator/constants.js";
import {
  createMentionTokenRegex,
  normalizeAlias,
  parseMentions,
  toMentionAlias,
} from "@/utils/stringUtils.js";
import { findAIByNormalizedAlias, getMentionTokenForAI } from "./aiLookup.js";

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

export const addMentionToResponse = (aiServices, response, targetAI) => {
  if (!targetAI) {
    return response;
  }

  let mentionHandle = "";

  if (typeof targetAI === "object") {
    const aliasSourceRaw =
      (targetAI.displayName && targetAI.displayName.toString()) ||
      (targetAI.alias && targetAI.alias.toString()) ||
      "";
    const aliasSource = aliasSourceRaw.trim();

    if (!aliasSource) {
      return response;
    }

    mentionHandle = aliasSource.startsWith("@")
      ? aliasSource
      : `@${aliasSource}`;
  } else {
    const normalizedTarget = normalizeAlias(targetAI);
    const targetService = findAIByNormalizedAlias(aiServices, normalizedTarget);
    const mentionAlias =
      getMentionTokenForAI(targetService) || toMentionAlias(targetAI);

    if (!mentionAlias) {
      return response;
    }

    mentionHandle = mentionAlias.startsWith("@")
      ? mentionAlias
      : `@${mentionAlias}`;
  }

  if (!mentionHandle.trim()) {
    return response;
  }

  const existingMentions = parseMentions(response).normalized;
  if (existingMentions.length >= MENTION_LIMITS.MAX_UNIQUE_PER_RESPONSE) {
    return response;
  }

  if (response.includes(mentionHandle)) {
    return response;
  }

  const formatIndex = Math.floor(Math.random() * MENTION_FORMATS.length);
  const formatFn = MENTION_FORMATS[formatIndex];
  return formatFn(mentionHandle, response);
};

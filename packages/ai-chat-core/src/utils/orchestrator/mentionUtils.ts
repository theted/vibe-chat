import { MENTION_FORMATS } from "@/orchestrator/constants.js";
import { normalizeAlias, toMentionAlias } from "@/utils/stringUtils.js";
import { findAIByNormalizedAlias, getMentionTokenForAI } from "./aiLookup.js";

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

  if (response.includes(mentionHandle)) {
    return response;
  }

  const formatIndex = Math.floor(Math.random() * MENTION_FORMATS.length);
  const formatFn = MENTION_FORMATS[formatIndex];
  return formatFn(mentionHandle, response);
};

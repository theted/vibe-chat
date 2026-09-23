/**
 * useAIMetadata — resolves the sender label (emoji + display name) for a
 * chat message, matching AI messages against known participants with the
 * same fallback chain the message payload provides.
 */

import { useMemo } from "react";
import { normalizeAliasKey, resolveEmoji } from "@/utils/ai";
import type { ChatMessageProps } from "@/types";
import type { AiParticipant } from "@/config/aiParticipants";

const DEFAULT_AI_DISPLAY_NAME = "AI Assistant";

type Message = ChatMessageProps["message"];

const findMatchedAI = (
  message: Message,
  aiParticipants: AiParticipant[],
): AiParticipant | null => {
  if (message.senderType !== "ai") return null;

  const normalizedTargets = [
    normalizeAliasKey(message.aiId),
    normalizeAliasKey(message.aiName),
    normalizeAliasKey(message.alias),
    normalizeAliasKey(message.displayName),
    normalizeAliasKey(message.modelName),
    normalizeAliasKey(message.modelKey),
    normalizeAliasKey(message.modelId),
    normalizeAliasKey(message.sender),
  ].filter(Boolean);

  if (normalizedTargets.length === 0) return null;

  return (
    aiParticipants.find((participant) => {
      const candidateValues = [
        participant.id,
        participant.alias,
        participant.name,
      ]
        .map(normalizeAliasKey)
        .filter(Boolean);
      return candidateValues.some((value) =>
        normalizedTargets.some((target) => target === value),
      );
    }) || null
  );
};

const getAIEmoji = (
  message: Message,
  matchedAI: AiParticipant | null,
): string => {
  if (message.senderType !== "ai") return "";
  if (message.emoji) return message.emoji;
  if (message.aiEmoji) return message.aiEmoji;
  if (matchedAI?.emoji) return matchedAI.emoji;

  if (message.providerKey || message.modelKey) {
    const combined = `${normalizeAliasKey(message.providerKey)}${normalizeAliasKey(message.modelKey)}`;
    const resolved = resolveEmoji(combined);
    if (resolved) return resolved;
  }

  return resolveEmoji(message.aiId || message.sender);
};

const getAIDisplayName = (
  message: Message,
  matchedAI: AiParticipant | null,
): string => {
  if (message.senderType !== "ai") return message.sender;

  const formatModelReference = (value: string | undefined): string =>
    value ? value.replace(/_/g, " ").trim() : "";

  const candidates = [
    matchedAI?.name,
    message.displayName,
    message.modelName,
    formatModelReference(message.modelKey),
    formatModelReference(message.modelId),
    message.alias,
    message.aiName,
    message.sender,
  ];

  return (
    candidates.find((v) => v && v.trim().length > 0) || DEFAULT_AI_DISPLAY_NAME
  );
};

export const useAIMetadata = (
  message: Message,
  aiParticipants: AiParticipant[],
) => {
  const matchedAI = useMemo(
    () => findMatchedAI(message, aiParticipants),
    [aiParticipants, message],
  );

  const senderName = useMemo(
    () => getAIDisplayName(message, matchedAI),
    [matchedAI, message],
  );

  const senderEmoji = useMemo(
    () => getAIEmoji(message, matchedAI),
    [matchedAI, message],
  );

  // Provider drives the voice colour; fall back to the name so an unmatched
  // model still gets a stable colour of its own
  const voiceKey = matchedAI?.provider || message.providerKey || senderName;

  return { matchedAI, senderName, senderEmoji, voiceKey };
};

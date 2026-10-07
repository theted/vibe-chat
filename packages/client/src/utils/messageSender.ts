/**
 * Message sender resolution - matches a chat message to a known AI and
 * derives its label, emoji and voice key. Pure so the transcript, the room
 * aura and reply quotes all resolve a sender the same way.
 */

import { normalizeAliasKey, resolveEmoji } from "@/utils/ai";
import type { Message } from "@/types";
import type { AiParticipant } from "@/config/aiParticipants";

const DEFAULT_AI_DISPLAY_NAME = "AI Assistant";

export const findMatchedAI = (
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

export const getAIEmoji = (
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

export const getAIDisplayName = (
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

/**
 * Provider drives the voice colour; falls back to the display name so an
 * unmatched model still gets a stable colour of its own.
 */
export const getVoiceKey = (
  message: Message,
  matchedAI: AiParticipant | null,
  senderName = getAIDisplayName(message, matchedAI),
): string => matchedAI?.provider || message.providerKey || senderName;

/** Voice key for a message, or null for humans and system lines. */
export const getMessageVoiceKey = (
  message: Message,
  aiParticipants: AiParticipant[],
): string | null =>
  message.senderType === "ai"
    ? getVoiceKey(message, findMatchedAI(message, aiParticipants))
    : null;

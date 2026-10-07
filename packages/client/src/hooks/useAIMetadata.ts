/**
 * useAIMetadata — resolves the sender label (emoji + display name) and voice
 * key for a chat message, memoised per message (see utils/messageSender).
 */

import { useMemo } from "react";
import {
  findMatchedAI,
  getAIDisplayName,
  getAIEmoji,
  getVoiceKey,
} from "@/utils/messageSender";
import type { ChatMessageProps } from "@/types";
import type { AiParticipant } from "@/config/aiParticipants";

type Message = ChatMessageProps["message"];

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

  const voiceKey = getVoiceKey(message, matchedAI, senderName);

  return { matchedAI, senderName, senderEmoji, voiceKey };
};

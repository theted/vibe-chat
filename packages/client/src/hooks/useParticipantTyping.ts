/**
 * useParticipantTyping — matching helpers that resolve whether a given
 * user or AI participant currently has an active typing indicator.
 */

import { useCallback } from "react";
import { normalizeAlias } from "@/utils/ai";
import type { NormalizedAiParticipant } from "@/utils/participants";
import type { TypingAI, TypingUser } from "@/types";

export const useParticipantTyping = (
  typingUsers: TypingUser[],
  typingAIs: TypingAI[],
) => {
  const isUserTyping = useCallback(
    (username: string): boolean => {
      const normalizedUsername = username?.toLowerCase();
      return typingUsers.some((user) => {
        if (user.isLocal) return false;
        return user.normalized === normalizedUsername || user.name === username;
      });
    },
    [typingUsers],
  );

  const isAITyping = useCallback(
    (aiEntry: NormalizedAiParticipant): boolean => {
      const normalizedTarget = normalizeAlias(
        aiEntry.alias || aiEntry.name || aiEntry.displayName,
      );
      return typingAIs.some((ai) => {
        if (ai.id && aiEntry.id && ai.id === aiEntry.id) return true;
        if (
          ai.normalizedAlias &&
          normalizedTarget &&
          ai.normalizedAlias === normalizedTarget
        )
          return true;
        if (
          ai.alias &&
          normalizedTarget &&
          normalizeAlias(ai.alias) === normalizedTarget
        )
          return true;
        return false;
      });
    },
    [typingAIs],
  );

  return { isUserTyping, isAITyping };
};

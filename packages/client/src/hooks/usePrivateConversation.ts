/**
 * Private 1-1 conversations: starting one from the participants list, working
 * out which AI the current room belongs to, and returning to the main room.
 *
 * The room id carries the AI, so the active partner is derived from roomInfo
 * rather than tracked separately - a reconnect or a reload lands in the same
 * chat without extra state.
 */

import { useCallback, useMemo } from "react";
import {
  DEFAULT_ROOM_ID,
  buildPrivateRoomId,
  getPrivateRoomAiId,
  isPrivateRoomId,
} from "@ai-chat/ai-configs";
import { normalizeAlias } from "@/utils/ai";
import { PRIVATE_CONVERSATIONS_ENABLED } from "@/constants/chat";
import type { AiParticipant } from "@/config/aiParticipants";
import type { RoomInfo } from "@/types";

interface UsePrivateConversationOptions {
  roomInfo: RoomInfo;
  aiParticipants: AiParticipant[];
  usernameRef: React.MutableRefObject<string>;
  joinRoom: (username: string, roomId?: string) => void;
  /** Clears messages/typing state so the previous room doesn't bleed through. */
  resetConversationView: () => void;
}

/** The id App sends when opening a private chat, mirroring the server's lookup. */
export const getParticipantRoomKey = (ai: AiParticipant): string =>
  ai.id || normalizeAlias(ai.alias || ai.name || "");

const matchesRoomAi = (ai: AiParticipant, roomAiId: string): boolean => {
  if (ai.id === roomAiId) return true;
  const normalizedRoomAiId = normalizeAlias(roomAiId);
  return (
    normalizeAlias(ai.alias || "") === normalizedRoomAiId ||
    normalizeAlias(ai.name || "") === normalizedRoomAiId
  );
};

export const usePrivateConversation = ({
  roomInfo,
  aiParticipants,
  usernameRef,
  joinRoom,
  resetConversationView,
}: UsePrivateConversationOptions) => {
  const isPrivateChat = isPrivateRoomId(roomInfo.roomId);

  const privateChatAi = useMemo(() => {
    if (!isPrivateChat) return null;
    const roomAiId = getPrivateRoomAiId(roomInfo.roomId ?? "");
    if (!roomAiId) return null;
    return aiParticipants.find((ai) => matchesRoomAi(ai, roomAiId)) ?? null;
  }, [aiParticipants, isPrivateChat, roomInfo.roomId]);

  const startPrivateConversation = useCallback(
    (ai: AiParticipant) => {
      if (!PRIVATE_CONVERSATIONS_ENABLED) return;

      const username = usernameRef.current.trim();
      if (!username) return;

      const roomId = buildPrivateRoomId(username, getParticipantRoomKey(ai));
      if (!roomId || roomId === roomInfo.roomId) return;

      resetConversationView();
      joinRoom(username, roomId);
    },
    [joinRoom, resetConversationView, roomInfo.roomId, usernameRef],
  );

  const leavePrivateConversation = useCallback(() => {
    const username = usernameRef.current.trim();
    if (!username || !isPrivateChat) return;

    resetConversationView();
    joinRoom(username, DEFAULT_ROOM_ID);
  }, [isPrivateChat, joinRoom, resetConversationView, usernameRef]);

  return {
    isPrivateChat,
    privateChatAi,
    startPrivateConversation,
    leavePrivateConversation,
  };
};

/**
 * Private conversations: starting a 1-1 chat from the participants list,
 * adding models to it (or taking them out) to make a private group, working
 * out which models the current room holds, and returning to the main room.
 *
 * The room id carries the models, so the cast is derived from roomInfo rather
 * than tracked separately - a reconnect lands in the same chat without extra
 * state. Changing the cast moves to the room id for the new set, bringing the
 * transcript along (see carryHistoryFrom).
 */

import { useCallback, useMemo } from "react";
import {
  DEFAULT_ROOM_ID,
  MAX_PRIVATE_ROOM_AIS,
  buildPrivateRoomId,
} from "@ai-chat/ai-configs";
import { normalizeAliasKey } from "@/utils/ai";
import { PRIVATE_CONVERSATIONS_ENABLED } from "@/constants/chat";
import type { AiParticipant } from "@/config/aiParticipants";
import type { JoinRoomOptions } from "@/hooks/useSocketEvents";
import type { PrivateRoster, RoomInfo } from "@/types";

interface UsePrivateConversationOptions {
  roomInfo: RoomInfo;
  aiParticipants: AiParticipant[];
  usernameRef: React.MutableRefObject<string>;
  joinRoom: (
    username: string,
    roomId?: string,
    options?: JoinRoomOptions,
  ) => void;
  /** Clears messages/typing state so the previous room doesn't bleed through. */
  resetConversationView: () => void;
}

const NO_ROOM_AIS: string[] = [];

/** The id App sends when opening a private chat, mirroring the server's lookup. */
export const getParticipantRoomKey = (ai: AiParticipant): string =>
  ai.id || normalizeAliasKey(ai.alias || ai.name || "");

const matchesRoomAi = (ai: AiParticipant, roomAiId: string): boolean => {
  if (ai.id === roomAiId) return true;
  const normalizedRoomAiId = normalizeAliasKey(roomAiId);
  return (
    normalizeAliasKey(ai.alias || "") === normalizedRoomAiId ||
    normalizeAliasKey(ai.name || "") === normalizedRoomAiId
  );
};

export const usePrivateConversation = ({
  roomInfo,
  aiParticipants,
  usernameRef,
  joinRoom,
  resetConversationView,
}: UsePrivateConversationOptions) => {
  // The server reports which AIs it scoped the room to. Deriving them from the
  // room id instead would promise models that were not loaded and that the
  // server quietly left out.
  const roomAiIds = roomInfo.privateAiIds ?? NO_ROOM_AIS;
  const isPrivateChat = roomAiIds.length > 0;

  const privateChatAis = useMemo(
    () =>
      roomAiIds.flatMap((roomAiId) => {
        const ai = aiParticipants.find((candidate) =>
          matchesRoomAi(candidate, roomAiId),
        );
        return ai ? [ai] : [];
      }),
    [aiParticipants, roomAiIds],
  );

  const privateRoster = useMemo<PrivateRoster | null>(
    () =>
      isPrivateChat
        ? {
            memberIds: privateChatAis.map((ai) => ai.id),
            isFull: roomAiIds.length >= MAX_PRIVATE_ROOM_AIS,
          }
        : null,
    [isPrivateChat, privateChatAis, roomAiIds.length],
  );

  const goToRoom = useCallback(
    (roomId: string | null, options?: JoinRoomOptions) => {
      const username = usernameRef.current.trim();
      if (!username || !roomId || roomId === roomInfo.roomId) return;

      resetConversationView();
      joinRoom(username, roomId, options);
    },
    [joinRoom, resetConversationView, roomInfo.roomId, usernameRef],
  );

  /** Add the model to the private chat, or take it out if it's already in. */
  const togglePrivateMember = useCallback(
    (ai: AiParticipant) => {
      const isMember = roomAiIds.some((roomAiId) =>
        matchesRoomAi(ai, roomAiId),
      );
      const nextAiIds = isMember
        ? roomAiIds.filter((roomAiId) => !matchesRoomAi(ai, roomAiId))
        : [...roomAiIds, getParticipantRoomKey(ai)];
      // The last model stays - leaving is what "Back to main room" is for
      if (nextAiIds.length === 0 || nextAiIds.length > MAX_PRIVATE_ROOM_AIS) {
        return;
      }

      goToRoom(buildPrivateRoomId(usernameRef.current.trim(), nextAiIds), {
        carryHistoryFrom: roomInfo.roomId,
      });
    },
    [goToRoom, roomAiIds, roomInfo.roomId, usernameRef],
  );

  /** A sidebar pick: opens a 1-1 chat from the main room, edits the cast in one. */
  const selectModel = useCallback(
    (ai: AiParticipant) => {
      if (!PRIVATE_CONVERSATIONS_ENABLED) return;
      if (isPrivateChat) {
        togglePrivateMember(ai);
        return;
      }
      goToRoom(
        buildPrivateRoomId(
          usernameRef.current.trim(),
          getParticipantRoomKey(ai),
        ),
      );
    },
    [goToRoom, isPrivateChat, togglePrivateMember, usernameRef],
  );

  const leavePrivateConversation = useCallback(() => {
    if (!isPrivateChat) return;
    goToRoom(DEFAULT_ROOM_ID);
  }, [goToRoom, isPrivateChat]);

  return {
    isPrivateChat,
    privateChatAis,
    privateRoster,
    selectModel,
    leavePrivateConversation,
  };
};

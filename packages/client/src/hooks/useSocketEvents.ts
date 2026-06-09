/**
 * useSocketEvents Hook - Connects socket events to React state
 *
 * Event handler factories live in socketEventHandlers.ts; this hook
 * wires them to the component state and socket lifecycle.
 */

import { useCallback, useEffect, useRef } from "react";
import { LOCAL_STORAGE_MESSAGES_LIMIT } from "@/constants/storage";
import {
  createConnectionStatusHandler,
  createRecentMessagesHandler,
  createPreviewMessageHandler,
  createRoomJoinedHandler,
  createUserTypingStartHandler,
  createUserTypingStopHandler,
  createAIGeneratingStartHandler,
  createAIGeneratingStopHandler,
} from "./socketEventHandlers";
import type {
  Message,
  ConnectionStatus,
  RoomInfo,
  AIStatus,
  Participant,
  TypingUser,
  TypingAI,
} from "@/types";
import type { AiParticipant } from "@/config/aiParticipants";
import { SOCKET_EVENTS } from "@ai-chat/ai-configs";

type StateSetter<T> = React.Dispatch<React.SetStateAction<T>>;
type ShowToast = (message: string, type?: string) => void;

interface UseSocketEventsOptions {
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  off: (event: string, handler: (...args: unknown[]) => void) => void;
  emit: (event: string, data?: unknown) => void;

  // State setters
  setConnectionStatus: StateSetter<ConnectionStatus>;
  setIsJoined: StateSetter<boolean>;
  setRoomInfo: StateSetter<RoomInfo>;
  setParticipants: StateSetter<Participant[]>;
  setAiParticipants: StateSetter<AiParticipant[]>;
  setMessages: StateSetter<Message[]>;
  setTypingUsers: StateSetter<TypingUser[]>;
  setTypingAIs: StateSetter<TypingAI[]>;
  setError: StateSetter<string | null>;
  setIsAuthLoading: StateSetter<boolean>;
  setHasSavedUsername: StateSetter<boolean>;

  // Preview state
  setPreviewMessages: StateSetter<Message[]>;
  setPreviewParticipants: StateSetter<Participant[]>;
  setPreviewAiParticipants: StateSetter<AiParticipant[]>;

  // Refs
  isJoinedRef: React.MutableRefObject<boolean>;
  previewMessagesRef: React.MutableRefObject<Message[]>;
  previewParticipantsRef: React.MutableRefObject<Participant[]>;
  previewAiParticipantsRef: React.MutableRefObject<AiParticipant[]>;
  usernameRef: React.MutableRefObject<string>;

  showToast: ShowToast;
}

/**
 * Registers all socket event listeners and returns convenience callbacks.
 */
export const useSocketEvents = (opts: UseSocketEventsOptions) => {
  const {
    on,
    off,
    emit,
    setConnectionStatus,
    setIsJoined,
    setRoomInfo,
    setParticipants,
    setAiParticipants,
    setMessages,
    setTypingUsers,
    setTypingAIs,
    setError,
    setIsAuthLoading,
    setHasSavedUsername,
    setPreviewMessages,
    setPreviewParticipants,
    setPreviewAiParticipants,
    isJoinedRef,
    previewMessagesRef,
    previewParticipantsRef,
    previewAiParticipantsRef,
    usernameRef,
    showToast,
  } = opts;

  const handlersRef = useRef<Record<string, (...args: unknown[]) => void>>({});

  useEffect(() => {
    const connectionHandler = createConnectionStatusHandler(
      setConnectionStatus,
      setIsJoined,
    );

    const previewState = {
      setPreviewMessages,
      setPreviewParticipants,
      setPreviewAiParticipants,
      setAiParticipants,
      setMessages,
      isJoinedRef,
    };

    const roomJoinState = {
      setIsJoined,
      setRoomInfo,
      setParticipants,
      setAiParticipants,
      setError,
      setIsAuthLoading,
      setHasSavedUsername,
      setMessages,
      previewMessagesRef,
      previewParticipantsRef,
      previewAiParticipantsRef,
    };

    const typingState = { setTypingUsers, setTypingAIs, usernameRef };

    const handlers: Record<string, (...args: unknown[]) => void> = {
      "connection-status": connectionHandler,
      [SOCKET_EVENTS.RECENT_MESSAGES]: createRecentMessagesHandler(previewState),
      [SOCKET_EVENTS.PREVIEW_MESSAGE]: createPreviewMessageHandler(previewState),
      [SOCKET_EVENTS.ROOM_JOINED]: createRoomJoinedHandler(roomJoinState),
      [SOCKET_EVENTS.NEW_MESSAGE]: (data: unknown) => {
        const message = data as Message;
        setMessages((prev) =>
          [...prev, message].slice(-LOCAL_STORAGE_MESSAGES_LIMIT),
        );
      },
      [SOCKET_EVENTS.USER_JOINED]: (data: unknown) => {
        const typedData = data as { username?: string };
        if (typedData?.username) {
          setParticipants((prev) => {
            if (prev.some((p) => p.username === typedData.username)) return prev;
            return [...prev, { username: typedData.username, joinedAt: Date.now() }];
          });
        }
      },
      [SOCKET_EVENTS.USER_LEFT]: (data: unknown) => {
        const typedData = data as { username?: string };
        if (typedData?.username) {
          setParticipants((prev) =>
            prev.filter((p) => p.username !== typedData.username),
          );
          setTypingUsers((prev) =>
            prev.filter((u) => u.name !== typedData.username),
          );
        }
      },
      [SOCKET_EVENTS.USER_TYPING_START]: createUserTypingStartHandler(typingState),
      [SOCKET_EVENTS.USER_TYPING_STOP]: createUserTypingStopHandler(typingState),
      [SOCKET_EVENTS.AI_GENERATING_START]: createAIGeneratingStartHandler(setTypingAIs),
      [SOCKET_EVENTS.AI_GENERATING_STOP]: createAIGeneratingStopHandler(setTypingAIs),
      [SOCKET_EVENTS.AI_STATUS_CHANGED]: (data: unknown) => {
        const typedData = data as AIStatus;
        if (typedData?.status === "sleeping") {
          showToast("AIs are taking a break. Send a message to wake them up!", "info");
        }
      },
      [SOCKET_EVENTS.TOPIC_CHANGED]: (data: unknown) => {
        const typedData = data as { newTopic?: string; changedBy?: string };
        if (typedData?.newTopic) {
          setRoomInfo((prev) => ({ ...prev, topic: typedData.newTopic || prev.topic }));
          showToast(
            `Topic changed to "${typedData.newTopic}" by ${typedData.changedBy || "someone"}`,
            "info",
          );
        }
      },
      [SOCKET_EVENTS.ERROR]: (data: unknown) => {
        const typedData = data as { message?: string };
        if (typedData?.message) {
          setError(typedData.message);
          showToast(typedData.message, "error");
        }
      },
    };

    handlersRef.current = handlers;

    Object.entries(handlers).forEach(([event, handler]) => { on(event, handler); });

    return () => {
      Object.entries(handlers).forEach(([event, handler]) => { off(event, handler); });
    };
  }, [on, off]);

  // --- Outbound helpers ---

  const sendMessage = useCallback(
    (content: string) => {
      emit(SOCKET_EVENTS.USER_MESSAGE, { content });
    },
    [emit],
  );

  const joinRoom = useCallback(
    (username: string, roomId = "default") => {
      setIsAuthLoading(true);
      emit(SOCKET_EVENTS.JOIN_ROOM, { username, roomId });
    },
    [emit, setIsAuthLoading],
  );

  const changeTopic = useCallback(
    (topic: string) => {
      emit(SOCKET_EVENTS.CHANGE_TOPIC, { topic });
    },
    [emit],
  );

  const startTyping = useCallback(() => emit(SOCKET_EVENTS.USER_TYPING_START), [emit]);
  const stopTyping = useCallback(() => emit(SOCKET_EVENTS.USER_TYPING_STOP), [emit]);

  return {
    sendMessage,
    joinRoom,
    changeTopic,
    startTyping,
    stopTyping,
  };
};

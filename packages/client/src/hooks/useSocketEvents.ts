/**
 * useSocketEvents Hook - Handles all socket event subscriptions
 */

import { useEffect, useCallback, useRef } from "react";
import { LOCAL_STORAGE_MESSAGES_LIMIT } from "@/constants/storage";
import { normalizeAlias, resolveEmoji } from "@/utils/ai";
import type {
  Message,
  Toast,
  ToastType,
  ConnectionStatus,
  RoomInfo,
  AIStatus,
  Participant,
  TypingUser,
  TypingAI,
} from "@/types";
import type { AiParticipant } from "@/config/aiParticipants";

interface UseSocketEventsOptions {
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  showToast: (message: string, type?: ToastType) => void;
}

interface UseSocketEventsState {
  setConnectionStatus: React.Dispatch<React.SetStateAction<ConnectionStatus>>;
  setIsJoined: React.Dispatch<React.SetStateAction<boolean>>;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setPreviewMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setPreviewParticipants: React.Dispatch<React.SetStateAction<Participant[]>>;
  setPreviewAiParticipants: React.Dispatch<React.SetStateAction<AiParticipant[]>>;
  setAiParticipants: React.Dispatch<React.SetStateAction<AiParticipant[]>>;
  setRoomInfo: React.Dispatch<React.SetStateAction<RoomInfo>>;
  setAiStatus: React.Dispatch<React.SetStateAction<AIStatus>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>;
  setTypingUsers: React.Dispatch<React.SetStateAction<TypingUser[]>>;
  setTypingAIs: React.Dispatch<React.SetStateAction<TypingAI[]>>;
  setIsAuthLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setHasSavedUsername: React.Dispatch<React.SetStateAction<boolean>>;
}

interface UseSocketEventsRefs {
  usernameRef: React.MutableRefObject<string>;
  isJoinedRef: React.MutableRefObject<boolean>;
  previewMessagesRef: React.MutableRefObject<Message[]>;
  previewParticipantsRef: React.MutableRefObject<Participant[]>;
  previewAiParticipantsRef: React.MutableRefObject<AiParticipant[]>;
}

export const useSocketEvents = (
  options: UseSocketEventsOptions,
  state: UseSocketEventsState,
  refs: UseSocketEventsRefs,
) => {
  const { on, showToast } = options;
  const {
    setConnectionStatus,
    setIsJoined,
    setMessages,
    setPreviewMessages,
    setPreviewParticipants,
    setPreviewAiParticipants,
    setAiParticipants,
    setRoomInfo,
    setAiStatus,
    setError,
    setParticipants,
    setTypingUsers,
    setTypingAIs,
    setIsAuthLoading,
    setHasSavedUsername,
  } = state;
  const {
    usernameRef,
    isJoinedRef,
    previewMessagesRef,
    previewParticipantsRef,
    previewAiParticipantsRef,
  } = refs;

  useEffect(() => {
    // Connection events
    on("connection-status", (status: unknown) => {
      console.log("🔌 Connection status update:", status);
      setConnectionStatus(status as ConnectionStatus);
      if (!(status as ConnectionStatus).connected) {
        setIsJoined(false);
      }
    });

    on("connection-established", (data: unknown) => {
      console.log("Connection established:", data);
    });

    on("recent-messages", (payload: unknown = {}) => {
      const typedPayload = payload as {
        messages?: Message[];
        participants?: Participant[];
        aiParticipants?: AiParticipant[];
      };
      const incomingMessages = Array.isArray(typedPayload.messages)
        ? typedPayload.messages
        : [];
      const incomingParticipants = Array.isArray(typedPayload.participants)
        ? typedPayload.participants
        : [];
      const incomingAiParticipants = Array.isArray(typedPayload.aiParticipants)
        ? typedPayload.aiParticipants
        : [];

      setPreviewMessages(incomingMessages);
      setPreviewParticipants(incomingParticipants);
      setPreviewAiParticipants(incomingAiParticipants);
      setAiParticipants(incomingAiParticipants);

      if (!isJoinedRef.current) {
        setMessages(incomingMessages);
      }
    });

    on("preview-message", (payload: unknown = {}) => {
      const typedPayload = payload as {
        message?: Message;
        participants?: Participant[];
        aiParticipants?: AiParticipant[];
      };
      const message = typedPayload.message;
      if (!message) return;

      setPreviewMessages((prev) => {
        const next = [...prev, message];
        return next.slice(-LOCAL_STORAGE_MESSAGES_LIMIT);
      });

      if (Array.isArray(typedPayload.participants)) {
        setPreviewParticipants(typedPayload.participants);
      }
      if (Array.isArray(typedPayload.aiParticipants)) {
        setPreviewAiParticipants(typedPayload.aiParticipants);
        if (isJoinedRef.current) {
          setAiParticipants(typedPayload.aiParticipants);
        }
      }

      if (!isJoinedRef.current) {
        setMessages((prev) =>
          [...prev, message].slice(-LOCAL_STORAGE_MESSAGES_LIMIT),
        );
      }
    });

    // Room events
    on("room-joined", (data: unknown) => {
      const typedData = data as RoomInfo & {
        participants?: Participant[];
        aiParticipants?: AiParticipant[];
      };
      setIsJoined(true);
      setRoomInfo(typedData);
      setParticipants(typedData.participants || []);
      setAiParticipants(
        typedData.aiParticipants || previewAiParticipantsRef.current || [],
      );
      setError(null);
      setIsAuthLoading(false);
      setHasSavedUsername(true);
      setMessages(() =>
        previewMessagesRef.current.length > 0
          ? [...previewMessagesRef.current]
          : [],
      );
      if (
        (typedData.participants || []).length === 0 &&
        previewParticipantsRef.current.length > 0
      ) {
        setParticipants(previewParticipantsRef.current);
      }
      console.log("Joined room:", data);
    });

    on("user-joined", (data: unknown) => {
      const typedData = data as { username: string };
      showToast(`${typedData.username} joined the chat`, "success");
    });

    on("user-left", (data: unknown) => {
      const typedData = data as { username: string };
      showToast(`${typedData.username} left the chat`, "warning");
      setTypingUsers((prev) =>
        prev.filter(
          (user) => user.normalized !== typedData.username?.toLowerCase(),
        ),
      );
    });

    // Message events
    on("new-message", (message: unknown) => {
      const typedMessage = message as Message;
      setMessages((prev) => [
        ...prev,
        {
          ...typedMessage,
          id: typedMessage.id || `msg-${Date.now()}-${Math.random()}`,
        },
      ]);
    });

    // Topic events
    on("topic-changed", (data: unknown) => {
      const typedData = data as { newTopic: string; changedBy: string };
      setRoomInfo((prev) => ({ ...prev, topic: typedData.newTopic }));
      const systemMessage: Message = {
        id: `topic-changed-${Date.now()}`,
        sender: "System",
        content: `Topic changed to: "${typedData.newTopic}" by ${typedData.changedBy}`,
        senderType: "system",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, systemMessage]);
    });

    // AI status events
    on("ai-status-changed", (data: unknown) => {
      setAiStatus(data as AIStatus);
    });

    on("ais-sleeping", (data: unknown) => {
      const typedData = data as { reason?: string };
      setAiStatus({ status: "sleeping", reason: typedData.reason });
    });

    on("ais-awakened", () => {
      setAiStatus({ status: "active" });
    });

    // Error events
    on("error", (data: unknown) => {
      const typedData = data as { message: string };
      setError(typedData.message);
      setIsAuthLoading(false);
      setTimeout(() => setError(null), 5000);
    });

    // Room info events
    on("room-info", (data: unknown) => {
      const typedData = data as {
        room: RoomInfo;
        participants?: Participant[];
        aiParticipants?: AiParticipant[];
      };
      setRoomInfo(typedData.room);
      setParticipants(typedData.participants || []);
      if (Array.isArray(typedData.aiParticipants)) {
        setAiParticipants(typedData.aiParticipants);
      }
    });

    // Typing events - users
    on("user-typing-start", (data: unknown) => {
      const typedData = data as {
        username?: string;
        name?: string;
        displayName?: string;
      };
      console.log("👤 User started typing:", data);
      setTypingUsers((prev) => {
        const name = typedData?.username || typedData?.name;
        if (!name) return prev;
        const normalized = name.toLowerCase();
        const isLocal =
          usernameRef.current &&
          normalized === usernameRef.current.toLowerCase();

        const exists = prev.some((user) => user.normalized === normalized);
        if (!exists) {
          return [
            ...prev,
            {
              id: normalized,
              name,
              displayName: typedData.displayName || name,
              normalized,
              type: "user" as const,
              isLocal,
            },
          ];
        }

        if (isLocal) {
          return prev.map((user) =>
            user.normalized === normalized ? { ...user, isLocal: true } : user,
          );
        }

        return prev;
      });
    });

    on("user-typing-stop", (data: unknown) => {
      const typedData = data as { username?: string; name?: string };
      console.log("👤 User stopped typing:", data);
      const name = typedData?.username || typedData?.name;
      if (!name) return;
      const normalized = name.toLowerCase();
      const isLocal =
        usernameRef.current && normalized === usernameRef.current.toLowerCase();

      setTypingUsers((prev) =>
        prev
          .filter((user) => user.normalized !== normalized)
          .filter((user) => (isLocal ? user.normalized !== normalized : true)),
      );
    });

    // Typing events - AIs
    on("ai-generating-start", (data: unknown) => {
      const typedData = data as {
        aiId?: string;
        providerKey?: string;
        modelKey?: string;
        alias?: string;
        displayName?: string;
        aiName?: string;
        emoji?: string;
      };
      console.log("🤖 AI started generating:", data);
      setTypingAIs((prev) => {
        const id =
          typedData?.aiId ||
          (typedData?.providerKey && typedData?.modelKey
            ? `${typedData.providerKey}_${typedData.modelKey}`
            : undefined);
        const alias =
          typedData?.alias || typedData?.displayName || typedData?.aiName;
        const displayName = typedData?.displayName || alias || id || "AI";
        const normalized = normalizeAlias(alias || displayName || id);

        const exists = prev.some(
          (ai) =>
            (id && ai.id === id) ||
            (normalized && ai.normalizedAlias === normalized),
        );
        if (exists) {
          return prev;
        }

        return [
          ...prev,
          {
            id: id || normalized,
            name: alias || displayName,
            displayName,
            alias: alias || displayName,
            normalizedAlias: normalized,
            type: "ai" as const,
            emoji: typedData?.emoji || resolveEmoji(alias || displayName || ""),
          },
        ];
      });
    });

    on("ai-generating-stop", (data: unknown) => {
      const typedData = data as {
        aiId?: string;
        providerKey?: string;
        modelKey?: string;
        alias?: string;
        displayName?: string;
        aiName?: string;
      };
      console.log("🤖 AI stopped generating:", data);
      const id =
        typedData?.aiId ||
        (typedData?.providerKey && typedData?.modelKey
          ? `${typedData.providerKey}_${typedData.modelKey}`
          : undefined);
      const normalized = normalizeAlias(
        typedData?.alias || typedData?.displayName || typedData?.aiName,
      );
      setTypingAIs((prev) =>
        prev.filter((ai) => {
          if (id && ai.id === id) {
            return false;
          }
          if (normalized && ai.normalizedAlias === normalized) {
            return false;
          }
          return true;
        }),
      );
    });
  }, [
    on,
    showToast,
    setConnectionStatus,
    setIsJoined,
    setMessages,
    setPreviewMessages,
    setPreviewParticipants,
    setPreviewAiParticipants,
    setAiParticipants,
    setRoomInfo,
    setAiStatus,
    setError,
    setParticipants,
    setTypingUsers,
    setTypingAIs,
    setIsAuthLoading,
    setHasSavedUsername,
    usernameRef,
    isJoinedRef,
    previewMessagesRef,
    previewParticipantsRef,
    previewAiParticipantsRef,
  ]);
};

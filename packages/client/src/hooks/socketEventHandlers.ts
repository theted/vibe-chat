/**
 * Socket event handler factories - pure functions returning event callbacks
 *
 * Each factory receives the state setters / refs it needs and returns
 * a callback suitable for `socket.on(event, callback)`.
 */

import { LOCAL_STORAGE_MESSAGES_LIMIT } from "@/constants/storage";
import { normalizeAlias, resolveEmoji } from "@/utils/ai";
import type {
  Message,
  ToastType,
  ConnectionStatus,
  RoomInfo,
  AIStatus,
  Participant,
  TypingUser,
  TypingAI,
} from "@/types";
import type { AiParticipant } from "@/config/aiParticipants";

// Shared option types
type StateSetter<T> = React.Dispatch<React.SetStateAction<T>>;
type ShowToast = (message: string, type?: ToastType) => void;

// --- Connection ---

export const createConnectionStatusHandler =
  (setConnectionStatus: StateSetter<ConnectionStatus>, setIsJoined: StateSetter<boolean>) =>
  (status: unknown) => {
    setConnectionStatus(status as ConnectionStatus);
    if (!(status as ConnectionStatus).connected) {
      setIsJoined(false);
    }
  };

// --- Recent / preview messages ---

interface PreviewState {
  setPreviewMessages: StateSetter<Message[]>;
  setPreviewParticipants: StateSetter<Participant[]>;
  setPreviewAiParticipants: StateSetter<AiParticipant[]>;
  setAiParticipants: StateSetter<AiParticipant[]>;
  setMessages: StateSetter<Message[]>;
  isJoinedRef: React.MutableRefObject<boolean>;
}

export const createRecentMessagesHandler = (state: PreviewState) =>
  (payload: unknown = {}) => {
    const typedPayload = payload as {
      messages?: Message[];
      participants?: Participant[];
      aiParticipants?: AiParticipant[];
      roomId?: string;
    };
    const incomingMessages = Array.isArray(typedPayload.messages) ? typedPayload.messages : [];
    const incomingParticipants = Array.isArray(typedPayload.participants) ? typedPayload.participants : [];
    const incomingAiParticipants = Array.isArray(typedPayload.aiParticipants) ? typedPayload.aiParticipants : [];

    state.setPreviewMessages(incomingMessages);
    state.setPreviewParticipants(incomingParticipants);
    state.setPreviewAiParticipants(incomingAiParticipants);
    state.setAiParticipants(incomingAiParticipants);

    if (!state.isJoinedRef.current || typedPayload.roomId) {
      state.setMessages(incomingMessages);
    }
  };

export const createPreviewMessageHandler = (state: PreviewState) =>
  (payload: unknown = {}) => {
    const typedPayload = payload as {
      message?: Message;
      participants?: Participant[];
      aiParticipants?: AiParticipant[];
    };
    const message = typedPayload.message;
    if (!message) return;

    state.setPreviewMessages((prev) => {
      const next = [...prev, message];
      return next.slice(-LOCAL_STORAGE_MESSAGES_LIMIT);
    });

    if (Array.isArray(typedPayload.participants)) {
      state.setPreviewParticipants(typedPayload.participants);
    }
    if (Array.isArray(typedPayload.aiParticipants)) {
      state.setPreviewAiParticipants(typedPayload.aiParticipants);
      if (state.isJoinedRef.current) {
        state.setAiParticipants(typedPayload.aiParticipants);
      }
    }

    if (!state.isJoinedRef.current) {
      state.setMessages((prev) =>
        [...prev, message].slice(-LOCAL_STORAGE_MESSAGES_LIMIT),
      );
    }
  };

// --- Room join ---

interface RoomJoinState {
  setIsJoined: StateSetter<boolean>;
  setRoomInfo: StateSetter<RoomInfo>;
  setParticipants: StateSetter<Participant[]>;
  setAiParticipants: StateSetter<AiParticipant[]>;
  setError: StateSetter<string | null>;
  setIsAuthLoading: StateSetter<boolean>;
  setHasSavedUsername: StateSetter<boolean>;
  setMessages: StateSetter<Message[]>;
  previewMessagesRef: React.MutableRefObject<Message[]>;
  previewParticipantsRef: React.MutableRefObject<Participant[]>;
  previewAiParticipantsRef: React.MutableRefObject<AiParticipant[]>;
}

export const createRoomJoinedHandler = (state: RoomJoinState) =>
  (data: unknown) => {
    const typedData = data as RoomInfo & {
      participants?: Participant[];
      aiParticipants?: AiParticipant[];
    };
    state.setIsJoined(true);
    state.setRoomInfo(typedData);
    state.setParticipants(typedData.participants || []);
    state.setAiParticipants(
      typedData.aiParticipants || state.previewAiParticipantsRef.current || [],
    );
    state.setError(null);
    state.setIsAuthLoading(false);
    state.setHasSavedUsername(true);
    state.setMessages(() =>
      state.previewMessagesRef.current.length > 0
        ? [...state.previewMessagesRef.current]
        : [],
    );
    if (
      (typedData.participants || []).length === 0 &&
      state.previewParticipantsRef.current.length > 0
    ) {
      state.setParticipants(state.previewParticipantsRef.current);
    }
  };

// --- Typing ---

interface TypingState {
  setTypingUsers: StateSetter<TypingUser[]>;
  setTypingAIs: StateSetter<TypingAI[]>;
  usernameRef: React.MutableRefObject<string>;
}

export const createUserTypingStartHandler = (state: TypingState) =>
  (data: unknown) => {
    const typedData = data as { username?: string; name?: string; displayName?: string };
    state.setTypingUsers((prev) => {
      const name = typedData?.username || typedData?.name;
      if (!name) return prev;
      const normalized = name.toLowerCase();
      const isLocal = !!state.usernameRef.current && normalized === state.usernameRef.current.toLowerCase();
      const exists = prev.some((user) => user.normalized === normalized);

      if (!exists) {
        return [...prev, {
          id: normalized,
          name,
          displayName: typedData.displayName || name,
          normalized,
          type: "user" as const,
          isLocal,
        }];
      }

      if (isLocal) {
        return prev.map((user) =>
          user.normalized === normalized ? { ...user, isLocal: true } : user,
        );
      }

      return prev;
    });
  };

export const createUserTypingStopHandler = (state: TypingState) =>
  (data: unknown) => {
    const typedData = data as { username?: string; name?: string };
    const name = typedData?.username || typedData?.name;
    if (!name) return;
    const normalized = name.toLowerCase();

    state.setTypingUsers((prev) =>
      prev.filter((user) => user.normalized !== normalized),
    );
  };

export const createAIGeneratingStartHandler = (setTypingAIs: StateSetter<TypingAI[]>) =>
  (data: unknown) => {
    const typedData = data as {
      aiId?: string;
      providerKey?: string;
      modelKey?: string;
      alias?: string;
      displayName?: string;
      aiName?: string;
      emoji?: string;
    };
    setTypingAIs((prev) => {
      const id =
        typedData?.aiId ||
        (typedData?.providerKey && typedData?.modelKey
          ? `${typedData.providerKey}_${typedData.modelKey}`
          : undefined);
      const alias = typedData?.alias || typedData?.displayName || typedData?.aiName;
      const displayName = typedData?.displayName || alias || id || "AI";
      const normalized = normalizeAlias(alias || displayName || id);

      const exists = prev.some(
        (ai) =>
          (id && ai.id === id) ||
          (normalized && ai.normalizedAlias === normalized),
      );
      if (exists) return prev;

      return [...prev, {
        id: id || normalized,
        name: alias || displayName,
        displayName,
        alias: alias || displayName,
        normalizedAlias: normalized,
        type: "ai" as const,
        emoji: typedData?.emoji || resolveEmoji(alias || displayName || ""),
      }];
    });
  };

export const createAIGeneratingStopHandler = (setTypingAIs: StateSetter<TypingAI[]>) =>
  (data: unknown) => {
    const typedData = data as {
      aiId?: string;
      providerKey?: string;
      modelKey?: string;
      alias?: string;
      displayName?: string;
      aiName?: string;
    };
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
        if (id && ai.id === id) return false;
        if (normalized && ai.normalizedAlias === normalized) return false;
        return true;
      }),
    );
  };

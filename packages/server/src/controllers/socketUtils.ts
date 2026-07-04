import type { ChatOrchestrator } from "@ai-chat/core";

import {
  MESSAGE_MAX_LENGTH,
  TOPIC_MAX_LENGTH,
  USER_MESSAGE_LIMIT,
  USER_MESSAGE_WINDOW_MS,
  USERNAME_MAX_LENGTH,
} from "@/config/serverConfig.js";

const PRIVATE_ROOM_PREFIX = "private:";

type ValidationResult =
  | { valid: true; value: string; message?: never }
  | { valid: false; message: string; value?: never };

export const getPrivateRoomAiId = (roomId: string): string | null => {
  if (!roomId.startsWith(PRIVATE_ROOM_PREFIX)) {
    return null;
  }

  const parts = roomId.split(":");
  if (parts.length < 3) {
    return null;
  }

  const aiId = parts.slice(2).join(":").trim();
  return aiId || null;
};

export const normalizeRoomAiToken = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

export const validateUsername = (username?: string): ValidationResult => {
  const value = username?.trim() || "";

  if (!value) {
    return { valid: false, message: "Username is required" };
  }

  if (value.length > USERNAME_MAX_LENGTH || !/^[a-zA-Z0-9_-]+$/.test(value)) {
    return {
      valid: false,
      message: `Username must be 1-${USERNAME_MAX_LENGTH} characters, letters, numbers, dash, underscore only`,
    };
  }

  return { valid: true, value };
};

export const validateMessageContent = (content?: string): ValidationResult => {
  const value = content?.trim() || "";

  if (!value) {
    return { valid: false, message: "Message content is required" };
  }

  if (content && content.length > MESSAGE_MAX_LENGTH) {
    return {
      valid: false,
      message: `Message too long (max ${MESSAGE_MAX_LENGTH} characters)`,
    };
  }

  return { valid: true, value };
};

export const validateTopic = (topic?: string): ValidationResult => {
  const value = topic?.trim() || "";

  if (!value) {
    return { valid: false, message: "Topic is required" };
  }

  if (topic && topic.length > TOPIC_MAX_LENGTH) {
    return {
      valid: false,
      message: `Topic too long (max ${TOPIC_MAX_LENGTH} characters)`,
    };
  }

  return { valid: true, value };
};

export const getRateLimitError = (
  retryAfterMs?: number,
): { message: string; code: "RATE_LIMITED"; retryAfterSeconds?: number } => {
  const windowMinutes = Math.round(USER_MESSAGE_WINDOW_MS / 60_000);
  const retryAfterSeconds = retryAfterMs
    ? Math.ceil(retryAfterMs / 1000)
    : undefined;

  return {
    message: `Rate limit exceeded: max ${USER_MESSAGE_LIMIT} messages per ${windowMinutes} minutes. Please wait before sending more.`,
    code: "RATE_LIMITED",
    retryAfterSeconds,
  };
};

export const applyRoomAIScope = (
  chatOrchestrator: ChatOrchestrator,
  roomId: string,
): void => {
  const privateAiId = getPrivateRoomAiId(roomId);

  if (!privateAiId) {
    chatOrchestrator.clearRoomAllowedAIs(roomId);
    return;
  }

  const directMatch = chatOrchestrator.aiServices.has(privateAiId)
    ? privateAiId
    : null;
  const normalizedMatch = directMatch
    ? null
    : chatOrchestrator.findAIByNormalizedAlias(
        normalizeRoomAiToken(privateAiId),
      );
  const resolvedAiId = directMatch || normalizedMatch?.id || null;

  if (resolvedAiId) {
    chatOrchestrator.setRoomAllowedAIs(roomId, [resolvedAiId]);
    return;
  }

  chatOrchestrator.clearRoomAllowedAIs(roomId);
};

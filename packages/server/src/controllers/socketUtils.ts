import type { ChatOrchestrator } from "@ai-chat/core";
import { getPrivateRoomAiId } from "@ai-chat/ai-configs";

import {
  MESSAGE_MAX_LENGTH,
  TOPIC_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
} from "@/config/serverConfig.js";
import type { RateLimitResult } from "@/types.js";

type ValidationResult =
  | { valid: true; value: string; message?: never }
  | { valid: false; message: string; value?: never };

export { getPrivateRoomAiId };

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

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const pluralize = (count: number, unit: string) =>
  `${count} ${unit}${count === 1 ? "" : "s"}`;

/** "hour", "day", "10 minutes" - the window as it reads after "per". */
export const describeWindow = (windowMs: number): string => {
  const units: Array<[number, string]> = [
    [DAY_MS, "day"],
    [HOUR_MS, "hour"],
    [MINUTE_MS, "minute"],
  ];
  for (const [unitMs, unit] of units) {
    if (windowMs % unitMs === 0) {
      const count = windowMs / unitMs;
      return count === 1 ? unit : pluralize(count, unit);
    }
  }
  return pluralize(Math.ceil(windowMs / 1000), "second");
};

/** Rounded up, so "1 minute" never turns out to be too early. */
export const describeWait = (waitMs: number): string => {
  if (waitMs >= 2 * HOUR_MS) return pluralize(Math.ceil(waitMs / HOUR_MS), "hour");
  if (waitMs >= MINUTE_MS) return pluralize(Math.ceil(waitMs / MINUTE_MS), "minute");
  return pluralize(Math.max(Math.ceil(waitMs / 1000), 1), "second");
};

export const getRateLimitError = ({
  retryAfterMs,
  limit,
}: Pick<RateLimitResult, "retryAfterMs" | "limit">): {
  message: string;
  code: "RATE_LIMITED";
  retryAfterSeconds?: number;
} => {
  const retryAfterSeconds = retryAfterMs
    ? Math.ceil(retryAfterMs / 1000)
    : undefined;
  const limitText = limit
    ? `You can send ${limit.maxMessages} messages per ${describeWindow(limit.windowMs)}.`
    : "You're sending messages too fast.";
  const waitText = retryAfterMs
    ? ` Try again in ${describeWait(retryAfterMs)}.`
    : " Please wait before sending more.";

  return {
    message: `${limitText}${waitText}`,
    code: "RATE_LIMITED",
    retryAfterSeconds,
  };
};

export type RoomAIScope = {
  /** The room id asked for a 1-1 chat, whether or not one could be set up. */
  requestedPrivate: boolean;
  /** The AI now scoped to the room, or null if the room is unscoped. */
  privateAiId: string | null;
};

/**
 * Point a room at the AI(s) allowed to speak in it. A private room resolves to
 * exactly one AI and becomes direct-only, so that model answers the user once
 * per message and never chats in the background.
 *
 * The result lets the caller tell the client what actually happened: a room id
 * naming a model this server never loaded degrades to an ordinary room, and the
 * UI must not promise a private chat it is not getting.
 */
export const applyRoomAIScope = (
  chatOrchestrator: ChatOrchestrator,
  roomId: string,
): RoomAIScope => {
  const privateAiId = getPrivateRoomAiId(roomId);

  if (!privateAiId) {
    chatOrchestrator.clearRoomAllowedAIs(roomId);
    return { requestedPrivate: false, privateAiId: null };
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
    chatOrchestrator.setRoomDirectOnly(roomId, true);
    return { requestedPrivate: true, privateAiId: resolvedAiId };
  }

  // Unknown AI in the room id: fall back to an ordinary room rather than a
  // private chat nobody can answer.
  console.warn(
    `Private room "${roomId}" names an unknown AI ("${privateAiId}") - treating it as a normal room`,
  );
  chatOrchestrator.clearRoomAllowedAIs(roomId);
  return { requestedPrivate: true, privateAiId: null };
};

import type { ChatOrchestrator, RoomAIStatus } from "@ai-chat/core";
import {
  getPrivateRoomAiIds,
  getPrivateRoomOwner,
  type RoomAIStatusPayload,
} from "@ai-chat/ai-configs";

import {
  MESSAGE_MAX_LENGTH,
  TOPIC_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
} from "@/config/serverConfig.js";
import type { RateLimitResult } from "@/types.js";

type ValidationResult =
  | { valid: true; value: string; message?: never }
  | { valid: false; message: string; value?: never };

/** The part of a room's AI budget clients show (see RoomAIStatusPayload). */
export const toAIStatusPayload = ({
  roomId,
  isAsleep,
  sleepReason,
  remaining,
  maxMessages,
  messageCount,
}: RoomAIStatus): RoomAIStatusPayload => ({
  roomId,
  status: isAsleep ? "sleeping" : "active",
  ...(sleepReason ? { reason: sleepReason } : {}),
  remaining,
  maxMessages,
  messageCount,
});

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
  if (waitMs >= 2 * HOUR_MS)
    return pluralize(Math.ceil(waitMs / HOUR_MS), "hour");
  if (waitMs >= MINUTE_MS)
    return pluralize(Math.ceil(waitMs / MINUTE_MS), "minute");
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
  /** The room id asked for a private chat, whether or not one could be set up. */
  requestedPrivate: boolean;
  /** The AIs now scoped to the room; empty if the room is unscoped. */
  privateAiIds: string[];
  /** AIs the room id names that this server never loaded (or has dropped). */
  unavailableAiIds: string[];
};

/** Match a room id's AI token to a loaded AI, by id or by normalised alias. */
const resolveRoomAiId = (
  chatOrchestrator: ChatOrchestrator,
  token: string,
): string | null => {
  if (chatOrchestrator.aiServices.has(token)) return token;
  return (
    chatOrchestrator.findAIByNormalizedAlias(normalizeRoomAiToken(token))?.id ??
    null
  );
};

/**
 * Point a room at the AI(s) allowed to speak in it. A private room naming one
 * AI becomes direct-only, so that model answers the user once per message and
 * never chats in the background. A private room naming several becomes a
 * private group: it runs like the main room, with only its members.
 *
 * The result lets the caller tell the client what actually happened: AIs this
 * server never loaded are left out, a group down to one model runs as a 1-1
 * chat, and a room with none left degrades to an ordinary room - the UI must
 * not promise a private chat it is not getting.
 */
export const applyRoomAIScope = (
  chatOrchestrator: ChatOrchestrator,
  roomId: string,
): RoomAIScope => {
  const requestedAiIds = getPrivateRoomAiIds(roomId);

  if (requestedAiIds.length === 0) {
    chatOrchestrator.clearRoomAllowedAIs(roomId);
    return { requestedPrivate: false, privateAiIds: [], unavailableAiIds: [] };
  }

  const resolved = requestedAiIds.map((token) => ({
    token,
    aiId: resolveRoomAiId(chatOrchestrator, token),
  }));
  const privateAiIds = [
    ...new Set(resolved.flatMap(({ aiId }) => (aiId ? [aiId] : []))),
  ];
  const unavailableAiIds = resolved
    .filter(({ aiId }) => !aiId)
    .map(({ token }) => token);

  if (unavailableAiIds.length > 0) {
    console.warn(
      `Private room "${roomId}" names unknown AIs (${unavailableAiIds.join(", ")}) - leaving them out`,
    );
  }

  if (privateAiIds.length === 0) {
    // Nobody in the room id can answer: fall back to an ordinary room rather
    // than a private chat that stays silent.
    chatOrchestrator.clearRoomAllowedAIs(roomId);
    return { requestedPrivate: true, privateAiIds, unavailableAiIds };
  }

  chatOrchestrator.setRoomAllowedAIs(roomId, privateAiIds);
  if (privateAiIds.length === 1) {
    chatOrchestrator.setRoomDirectOnly(roomId, true);
  } else {
    chatOrchestrator.setRoomPrivateGroup(roomId, true);
  }
  return { requestedPrivate: true, privateAiIds, unavailableAiIds };
};

/**
 * Whether joining toRoomId may bring fromRoomId's transcript along: only
 * between two different private rooms of the user who is joining. Usernames
 * aren't authenticated, so this keeps one user's chat from landing in
 * another's by mistake rather than guarding against a determined caller.
 */
export const canCarryHistory = (
  fromRoomId: string | undefined,
  toRoomId: string,
  username: string,
): fromRoomId is string =>
  Boolean(fromRoomId) &&
  fromRoomId !== toRoomId &&
  getPrivateRoomOwner(fromRoomId ?? "") === username &&
  getPrivateRoomOwner(toRoomId) === username;

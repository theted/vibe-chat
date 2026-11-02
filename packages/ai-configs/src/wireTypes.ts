/**
 * Shared wire types for the socket protocol.
 *
 * The chat-message shape that travels between server and client previously
 * existed as two independently drifting definitions (server `ChatMessage`,
 * client `Message`). This base captures the fields both sides agree on;
 * each side extends it with its own extras and may narrow optional fields
 * it guarantees (e.g. the client requires `id` and `timestamp` because the
 * server always sets them before emitting).
 */
export type WireSenderType = "user" | "ai" | "system" | "assistant";

export interface ChatMessageBase {
  id?: string;
  sender: string;
  content: string;
  senderType: WireSenderType;
  timestamp?: number;
  // AI-specific fields
  aiId?: string;
  aiName?: string;
  alias?: string;
  displayName?: string;
  modelKey?: string;
  modelId?: string;
  providerKey?: string;
  emoji?: string;
  // Quote-reply: the earlier message this one answers, which clients show
  // as a quote above it. Set when a person or AI quote-replies, and on an
  // AI's answer to a message that @mentioned it. Sender and excerpt are a
  // snapshot taken when the reply was posted, so the quote still reads once
  // the original has left the loaded history.
  replyToMessageId?: string | null;
  replyToSender?: string | null;
  replyToExcerpt?: string | null;
}

/**
 * A room's AI reply budget as clients see it. AIs may send only so many
 * messages in a row before a person speaks; the server sends this on join,
 * with the recent messages, and whenever it changes (AI_STATUS_CHANGED).
 */
export interface RoomAIStatusPayload {
  roomId: string;
  status: "active" | "sleeping";
  /** Why the AIs sleep: "message-limit-reached" or "manual". */
  reason?: string;
  /** AI messages the room can still take before the AIs sleep. */
  remaining: number;
  maxMessages: number;
  /** AI messages since a person last spoke. */
  messageCount: number;
}

/** ROOM_CLEARED: someone ran /clear; clients empty the room and say who. */
export interface RoomClearedPayload {
  roomId: string;
  /** Username of whoever cleared it */
  by: string;
  timestamp: number;
}

/** One message of a prompt, as passed to the model's service. */
export interface WirePromptMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** The prompt behind one AI reply (/debug). */
export interface WirePromptRecord {
  roomId: string;
  aiId: string;
  aiName: string;
  modelId?: string;
  /** The reply as posted, after cleanup */
  reply: string;
  messages: WirePromptMessage[];
  createdAt: number;
}

/**
 * LAST_PROMPT: the answer to GET_LAST_PROMPT, sent only to whoever asked.
 * `prompt` is null when no AI reply in the room has one on record (they
 * live in server memory, and @Chat's answers have none).
 */
export interface LastPromptPayload {
  roomId: string;
  prompt: WirePromptRecord | null;
}

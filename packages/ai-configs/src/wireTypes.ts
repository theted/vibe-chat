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
  // Reply metadata - set when an AI responds to a message that @mentioned it,
  // so clients can render a quote of the message being replied to
  mentionsTriggerMessageId?: string | null;
  mentionsTriggerSender?: string | null;
}

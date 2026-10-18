/**
 * @ai-chat/ai-configs
 *
 * Centralized AI model configurations, emojis, and metadata.
 * Single source of truth for all AI participant definitions.
 */

// Types
export type {
  AiParticipant,
  AiParticipantStatus,
  AiDisplayInfo,
  AiDisplayInfoMap,
} from "./types.js";

// Participants
export {
  DEFAULT_AI_PARTICIPANTS,
  getParticipantById,
  getParticipantByAlias,
  getActiveParticipants,
  getParticipantsByProvider,
} from "./participants.js";

// Display Info
export {
  AI_DISPLAY_INFO,
  getDisplayInfo,
  getEmojiByModelId,
} from "./displayInfo.js";

// Lookups
export {
  AI_EMOJI_LOOKUP,
  AI_MENTION_MAPPINGS,
  normalizeAlias,
  resolveEmoji,
  mapMentionsToAiNames,
  resolveMentionTarget,
} from "./lookups.js";

// Alias utilities
export { normalizeAliasKey } from "./aliasUtils.js";

// Room id conventions (default room, private 1-1 and group rooms)
export {
  DEFAULT_ROOM_ID,
  MAX_PRIVATE_ROOM_AIS,
  PRIVATE_ROOM_AI_SEPARATOR,
  PRIVATE_ROOM_PREFIX,
  isPrivateRoomId,
  buildPrivateRoomId,
  getPrivateRoomAiIds,
  getPrivateRoomOwner,
  normalizeRoomId,
} from "./rooms.js";

// Socket wire-protocol events
export { SOCKET_EVENTS } from "./socketEvents.js";
export type { SocketEventName } from "./socketEvents.js";

// Socket wire-protocol types
export type {
  ChatMessageBase,
  RoomAIStatusPayload,
  WireSenderType,
} from "./wireTypes.js";

// Environment/flag utilities
export { parseBooleanFlag } from "./envUtils.js";

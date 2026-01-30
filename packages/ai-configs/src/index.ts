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
} from "./lookups.js";

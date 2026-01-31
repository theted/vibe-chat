/**
 * Re-export AI participant configs from @ai-chat/ai-configs package.
 * This file maintains backwards compatibility for existing imports.
 */
export {
  DEFAULT_AI_PARTICIPANTS,
  getParticipantById,
  getParticipantByAlias,
  getActiveParticipants,
  getParticipantsByProvider,
} from "@ai-chat/ai-configs";

export type { AiParticipant, AiParticipantStatus } from "@ai-chat/ai-configs";

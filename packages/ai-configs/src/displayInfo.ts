import { DEFAULT_AI_PARTICIPANTS } from "./participants.js";
import type { AiDisplayInfoMap } from "./types.js";

/**
 * Display metadata for AI providers/models.
 * Shared across packages to ensure consistent labels and emoji.
 */
export const AI_DISPLAY_INFO: AiDisplayInfoMap = DEFAULT_AI_PARTICIPANTS.reduce(
  (acc, participant) => {
    acc[participant.id] = {
      displayName: participant.name,
      alias: participant.alias,
      emoji: participant.emoji,
    };
    return acc;
  },
  {} as AiDisplayInfoMap,
);

/**
 * Get display info by model ID
 */
export const getDisplayInfo = (modelId: string) => AI_DISPLAY_INFO[modelId];

/**
 * Get emoji by model ID
 */
export const getEmojiByModelId = (modelId: string): string =>
  AI_DISPLAY_INFO[modelId]?.emoji ?? "🤖";

/**
 * Re-export display info from @ai-chat/ai-configs package.
 * This file maintains backwards compatibility for existing imports.
 */
export {
  AI_DISPLAY_INFO,
  getDisplayInfo,
  getEmojiByModelId,
} from "@ai-chat/ai-configs";

export type { AiDisplayInfo, AiDisplayInfoMap } from "@ai-chat/ai-configs";

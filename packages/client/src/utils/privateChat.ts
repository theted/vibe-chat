/**
 * What picking a model in the sidebar does: from the main room it opens a
 * 1-1 chat, inside a private chat it adds the model or takes it out again.
 */

import { MAX_PRIVATE_ROOM_AIS } from "@ai-chat/ai-configs";
import type { PrivateRoster } from "@/types";

export interface ModelSelection {
  /** In the current private chat, so highlighted */
  isMember: boolean;
  /** False once a private chat is full, for models not in it */
  canSelect: boolean;
  title: string;
}

export const getModelSelection = (
  aiId: string | undefined,
  name: string,
  roster: PrivateRoster | null,
): ModelSelection => {
  if (!roster) {
    return {
      isMember: false,
      canSelect: true,
      title: `Start private chat with ${name}`,
    };
  }

  const isMember = aiId != null && roster.memberIds.includes(aiId);
  if (isMember) {
    // The last model can't be taken out - "Back to main room" leaves instead
    return {
      isMember,
      canSelect: true,
      title:
        roster.memberIds.length > 1
          ? `Remove ${name} from this chat`
          : `You are privately chatting with ${name}`,
    };
  }

  return roster.isFull
    ? {
        isMember,
        canSelect: false,
        title: `This chat already has ${MAX_PRIVATE_ROOM_AIS} models`,
      }
    : { isMember, canSelect: true, title: `Add ${name} to this chat` };
};

/** The sidebar's line under "All models", saying what a pick will do. */
export const getModelPickHint = (roster: PrivateRoster | null): string => {
  if (!roster) return "Pick one to talk privately.";
  return roster.isFull
    ? `This chat is full (${MAX_PRIVATE_ROOM_AIS} models). Pick a member to remove it.`
    : `Pick models to add to this chat, up to ${MAX_PRIVATE_ROOM_AIS}.`;
};

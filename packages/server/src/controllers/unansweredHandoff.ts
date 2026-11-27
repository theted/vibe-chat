/**
 * Turns an unanswered message (see ChatOrchestrator "message-unanswered")
 * into the line @Chat posts to hand it to an AI.
 */

import type { UnansweredMessage } from "@ai-chat/core";
import {
  HANDOFF_FALLBACK_ASKER,
  HANDOFF_TEXT,
} from "@/config/unansweredHandoff.js";

export type HandoffNames = {
  /** Display name of whoever wrote the unanswered message */
  asker?: string | null;
  /** Display names of the mentioned AIs that never answered */
  silentNames: string[];
  /** @handle (without "@") of the AI taking over, or null for nobody */
  handoffHandle: string | null;
};

/** "A", "A and B", "A, B and C" */
const joinNames = (names: string[]): string =>
  names.length <= 1
    ? (names[0] ?? "")
    : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;

export const buildHandoffText = (
  { reason, nearMiss, silentAIIds, handoffAIId }: UnansweredMessage,
  { asker, silentNames, handoffHandle }: HandoffNames,
): string => {
  const who = asker?.trim() || HANDOFF_FALLBACK_ASKER;
  if (!handoffHandle) return HANDOFF_TEXT.NOBODY_FREE(who);

  if (reason === "near-miss-handle" && nearMiss) {
    return HANDOFF_TEXT.NEAR_MISS(nearMiss.token, who, handoffHandle);
  }
  // A 1-1 chat hands the message back to the only AI it has
  if (handoffAIId && silentAIIds.includes(handoffAIId)) {
    return HANDOFF_TEXT.RETRY(who, handoffHandle);
  }
  if (reason === "mention-unanswered" && silentNames.length > 0) {
    return HANDOFF_TEXT.MENTION_UNANSWERED(
      joinNames(silentNames),
      who,
      handoffHandle,
    );
  }
  return HANDOFF_TEXT.NO_TAKERS(who, handoffHandle);
};

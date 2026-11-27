/**
 * Why a person's message went unanswered, and which AI should pick it up
 * (issue #311). Pure, so every case is unit-testable; the server turns the
 * result into @Chat's hand-off message.
 */

import { findMentionSuggestions } from "@ai-chat/ai-configs";
import type { ContextMessage } from "@/types/orchestrator.js";
import {
  getMentionTokenForAI,
  type OrchestratorAIService,
} from "./aiLookup.js";

export type UnansweredReason =
  /** It @mentioned a handle nobody has, close to one AI's handle */
  | "near-miss-handle"
  /** It @mentioned AIs, and none of them answered (failed, timed out) */
  | "mention-unanswered"
  /** It addressed the room, and nobody picked it up */
  | "no-takers";

export type UnansweredMessage = {
  roomId: string;
  message: ContextMessage;
  reason: UnansweredReason;
  /** Mentioned AIs that never answered */
  silentAIIds: string[];
  /** The near miss as written and the handle it most likely meant */
  nearMiss?: { token: string; suggestion: string };
  /** AI to hand the message to; null when no AI in the room is free */
  handoffAIId: string | null;
};

type RoomAI = OrchestratorAIService & { id: string };

const mentionedAIIds = (
  message: ContextMessage,
  roomAIs: RoomAI[],
): string[] => {
  const targets = new Set(message.mentionsNormalized ?? []);
  return roomAIs
    .filter((ai) => ai.normalizedAlias && targets.has(ai.normalizedAlias))
    .map((ai) => ai.id);
};

/**
 * @param roomAIs - active AIs allowed to speak in the room
 * @param pick - chooses among candidates (random by default; tests pin it)
 */
export const describeUnanswered = (
  roomId: string,
  message: ContextMessage,
  allRoomAIs: OrchestratorAIService[],
  pick: <T>(items: T[]) => T = (items) =>
    items[Math.floor(Math.random() * items.length)],
): UnansweredMessage => {
  const roomAIs = allRoomAIs.filter((ai): ai is RoomAI => Boolean(ai.id));
  const silentAIIds = mentionedAIIds(message, roomAIs);
  const base = { roomId, message, silentAIIds };

  if (silentAIIds.length === 0) {
    const handles = roomAIs
      .map((ai) => getMentionTokenForAI(ai))
      .filter((handle): handle is string => Boolean(handle));
    const [nearMiss] = findMentionSuggestions(message.content ?? "", handles);
    const meant = nearMiss
      ? roomAIs.find((ai) => getMentionTokenForAI(ai) === nearMiss.suggestion)
      : undefined;
    if (nearMiss && meant) {
      return {
        ...base,
        reason: "near-miss-handle",
        nearMiss,
        handoffAIId: meant.id,
      };
    }
  }

  // Prefer an AI that isn't busy and wasn't the one that already went
  // quiet. A room with nobody else (a 1-1 chat) retries the AI it has.
  const others = roomAIs.filter(
    (ai) => !silentAIIds.includes(ai.id) && !ai.isGenerating,
  );
  const fallback = roomAIs.filter((ai) => !ai.isGenerating);
  const candidates = others.length > 0 ? others : fallback;
  return {
    ...base,
    reason: silentAIIds.length > 0 ? "mention-unanswered" : "no-takers",
    handoffAIId: candidates.length > 0 ? pick(candidates).id : null,
  };
};

/**
 * Interaction strategy types: how AIs decide to respond.
 *
 * Models the object `determineInteractionStrategy` actually returns and
 * `applyInteractionStrategy` consumes - the per-response decision about
 * strategy, mention target, energy, and wind-down.
 */

import type { ResponseEnergy } from "../../orchestrator/constants.js";

export type InteractionStrategy =
  | "agree-expand"
  | "challenge"
  | "redirect"
  | "question"
  | "direct"
  | "reopen";

/** A human participant selected as mention target (AIs resolve to tokens). */
export interface UserMentionTarget {
  type: "user";
  alias: string;
  displayName: string;
}

/**
 * Who a response should @mention: AI targets arrive pre-resolved to their
 * mention token string, user targets carry alias info for handle building.
 */
export type MentionTarget = string | UserMentionTarget;

/** Per-response decision produced by `determineInteractionStrategy`. */
export interface InteractionStrategyDecision {
  type: InteractionStrategy;
  weight: number;
  shouldMention: boolean;
  targetAI: MentionTarget | null;
  /** Literal @handle the model is asked to write, original casing kept. */
  mentionHandle: string | null;
  /** Whether the last message @mentioned the responding AI. */
  mentionsCurrentAI: boolean;
  energy: ResponseEnergy;
  /** Message budget nearly spent - instruct a brief, closing response. */
  windingDown: boolean;
}

/**
 * Interaction strategy types: how AIs decide to respond.
 */

import { Message } from "../index.js";
import type { AIParticipant } from "./participants.js";

export type InteractionStrategy =
  | "agree-expand"
  | "challenge"
  | "redirect"
  | "question"
  | "direct"
  | "support"
  | "analyze";

export interface InteractionStrategyConfig {
  type: InteractionStrategy;
  weight: number;
  description: string;
  triggers: string[];
  constraints?: {
    maxConsecutive?: number;
    cooldownMs?: number;
    requiresContext?: boolean;
  };
}

export interface StrategyWeight {
  strategy: InteractionStrategy;
  weight: number;
  reason?: string;
}

export interface StrategyContext {
  recentMessages: Message[];
  aiParticipants: AIParticipant[];
  currentSpeaker?: string;
  messageCount: number;
  silenceDurationMs: number;
  lastStrategyUsed?: InteractionStrategy;
}

export interface StrategyDecision {
  selectedStrategy: InteractionStrategy;
  confidence: number;
  weights: StrategyWeight[];
  reasoning: string;
}

export class StrategyError extends Error {
  constructor(
    message: string,
    public readonly strategy?: InteractionStrategy,
    public readonly context?: StrategyContext,
  ) {
    super(message);
    this.name = "StrategyError";
  }
}

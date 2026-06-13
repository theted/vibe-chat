/**
 * Response scheduling types: when and in what order AIs respond.
 */

import type { AIParticipant } from "./participants.js";
import type { InteractionStrategy } from "./strategy.js";
import type { MentionContext } from "./mentions.js";
import { isAIParticipant } from "./participants.js";

export interface ResponseSchedule {
  participant: AIParticipant;
  delayMs: number;
  priority: number;
  strategy: InteractionStrategy;
  context?: Record<string, unknown>;
}

export interface SchedulingConfig {
  baseDelayMs: number;
  maxDelayMs: number;
  minDelayMs: number;
  variabilityFactor: number;
  priorityWeight: number;
  enableStaggering: boolean;
}

export interface SchedulingContext {
  activeResponders: AIParticipant[];
  queuedResponses: ResponseSchedule[];
  lastResponseTime: number;
  averageResponseTime: number;
  typingAwareDelays: boolean;
}

export interface IResponseScheduler {
  scheduleResponses(
    participants: AIParticipant[],
    strategy: InteractionStrategy,
    context: SchedulingContext,
  ): ResponseSchedule[];

  selectRespondingAIs(
    participants: AIParticipant[],
    mentions: MentionContext,
    strategy: InteractionStrategy,
  ): AIParticipant[];

  calculateResponseDelay(
    participant: AIParticipant,
    position: number,
    total: number,
    context: SchedulingContext,
  ): number;

  executeSchedule(schedule: ResponseSchedule[]): Promise<void>;
}

export class SchedulingError extends Error {
  constructor(
    message: string,
    public readonly schedule?: ResponseSchedule[],
    public readonly participants?: AIParticipant[],
  ) {
    super(message);
    this.name = "SchedulingError";
  }
}

export const isResponseSchedule = (obj: unknown): obj is ResponseSchedule => {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "participant" in obj &&
    "delayMs" in obj &&
    "strategy" in obj &&
    isAIParticipant((obj as ResponseSchedule).participant)
  );
};

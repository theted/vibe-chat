/**
 * AI participant types for the orchestrator.
 */

import { IAIService, AIProvider, AIModel } from "../index.js";

export interface AIParticipant {
  id: string;
  service: IAIService;
  provider: AIProvider;
  model: AIModel;
  alias?: string;
  normalizedAlias?: string;
  isActive: boolean;
  isSleeping: boolean;
  lastResponseTime?: number;
  messageCount: number;
  metadata?: Record<string, unknown>;
}

export interface AIParticipantConfig {
  provider: string;
  model: string;
  alias?: string;
  initiallyActive?: boolean;
  customPrompt?: string;
  responseStyle?: string;
}

export type ParticipantStatus = "active" | "sleeping" | "inactive" | "error";

export class ParticipantError extends Error {
  constructor(
    message: string,
    public readonly participantId?: string,
    public readonly operation?: string,
  ) {
    super(message);
    this.name = "ParticipantError";
  }
}

export const isAIParticipant = (obj: unknown): obj is AIParticipant => {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "id" in obj &&
    "service" in obj &&
    "provider" in obj &&
    typeof (obj as AIParticipant).id === "string"
  );
};

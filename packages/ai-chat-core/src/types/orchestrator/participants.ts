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

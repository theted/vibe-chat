/**
 * Top-level orchestrator types: configuration, state, events, and the main
 * IChatOrchestrator contract.
 */

import EventEmitter from "events";
import { Message, IAIService } from "../index.js";
import type { AIParticipant, AIParticipantConfig } from "./participants.js";
import type {
  InteractionStrategy,
  StrategyContext,
  StrategyDecision,
} from "./strategy.js";
import type { ResponseSchedule, SchedulingContext } from "./scheduling.js";
import type { BackgroundConversationState } from "./background.js";

export interface ChatOrchestratorConfig {
  maxConcurrentChats?: number;
  defaultTimeout?: number;
  retryAttempts?: number;
  maxMessageHistory?: number;
  enableBackgroundConversation?: boolean;
  silenceTimeoutMs?: number;
  responseCooldownMs?: number;
  maxResponseLength?: number;
}

export type OrchestratorEvent =
  | "participant_added"
  | "participant_removed"
  | "response_scheduled"
  | "response_generated"
  | "strategy_selected"
  | "background_conversation_started"
  | "background_conversation_stopped"
  | "participant_sleeping"
  | "participant_awakened"
  | "mention_detected"
  | "error";

export interface OrchestratorEventData {
  type: OrchestratorEvent;
  timestamp: number;
  payload: Record<string, unknown>;
}

export interface OrchestratorState {
  aiServices: Map<string, IAIService>;
  activeAIs: AIParticipant[];
  sleepingAIs: Set<string>;
  messageHistory: Message[];
  currentStrategy?: InteractionStrategy;
  lastUserMessageTime?: number;
  backgroundConversation: BackgroundConversationState;
  scheduling: SchedulingContext;
}

export interface IChatOrchestrator extends EventEmitter {
  // Core functionality
  initialize(config?: ChatOrchestratorConfig): Promise<void>;
  addAIService(service: IAIService, config: AIParticipantConfig): Promise<void>;
  removeAIService(serviceId: string): Promise<void>;

  // Message processing
  processMessage(message: Message): Promise<void>;
  generateResponses(
    message: Message,
    strategy?: InteractionStrategy,
  ): Promise<Message[]>;

  // Participant management
  getActiveParticipants(): AIParticipant[];
  setParticipantActive(participantId: string, active: boolean): void;
  findParticipantByAlias(alias: string): AIParticipant | undefined;

  // Strategy and scheduling
  determineInteractionStrategy(context: StrategyContext): StrategyDecision;
  scheduleResponses(
    participants: AIParticipant[],
    strategy: InteractionStrategy,
  ): ResponseSchedule[];

  // Background conversation
  startBackgroundConversation(): void;
  stopBackgroundConversation(): void;
  putParticipantsToSleep(participants: AIParticipant[]): void;
  wakeUpParticipants(participants: AIParticipant[]): void;

  // Room-scoped AI restrictions
  setRoomAllowedAIs(roomId: string, aiIds: string[]): void;
  clearRoomAllowedAIs(roomId: string): void;
  filterAIsForRoom(roomId: string, aiIds: string[]): string[];

  // State and lifecycle
  getState(): OrchestratorState;
  shutdown(): Promise<void>;
}

export class OrchestratorError extends Error {
  constructor(
    message: string,
    public readonly operation?: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "OrchestratorError";
  }
}

export type ConversationPhase =
  | "starting"
  | "active"
  | "background"
  | "ending"
  | "silent";

export interface ConversationMetrics {
  totalMessages: number;
  participantMessageCounts: Record<string, number>;
  averageResponseTime: number;
  strategiesUsed: Record<InteractionStrategy, number>;
  mentionsCount: number;
  backgroundConversationTime: number;
}

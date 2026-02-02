/**
 * Orchestrator-specific type definitions for AI Chat Core library
 */

import { Message, IAIService, AIProvider, AIModel } from "./index.js";
import EventEmitter from "events";

// Orchestrator configuration
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

// Interaction strategies
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

// AI Participant management
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

// Mention handling
export interface MentionData {
  type: "direct" | "indirect" | "context";
  targetAI?: AIParticipant;
  originalText: string;
  normalizedTarget: string;
  confidence: number;
}

export interface MentionContext {
  message: Message;
  mentions: MentionData[];
  explicitTargets: AIParticipant[];
  implicitTargets: AIParticipant[];
}

// Response scheduling
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

// Background conversation management
export interface BackgroundConversationConfig {
  enabled: boolean;
  triggerSilenceMs: number;
  participantRotationMs: number;
  maxBackgroundMessages: number;
  sleepAfterMessages: number;
  wakeUpProbability: number;
}

export interface BackgroundConversationState {
  isActive: boolean;
  lastTriggerTime?: number;
  sleepingParticipants: Set<string>;
  activeTimer?: NodeJS.Timeout;
  messagesSinceUserInput: number;
}

// System prompt and context enhancement
export interface PromptContext {
  strategy: InteractionStrategy;
  recentContext: string;
  participantCount: number;
  conversationTopic?: string;
  userIntent?: string;
  emotionalTone?: string;
}

export interface PromptTemplate {
  base: string;
  strategySpecific: Record<InteractionStrategy, string>;
  contextEnhancements: {
    topicChange: string;
    comment: string;
    agreement: string;
    challenge: string;
  };
}

export interface SystemPromptBuilderConfig {
  templates: PromptTemplate;
  maxContextLength: number;
  includeParticipantInfo: boolean;
  includeStrategyHints: boolean;
}

// Event types for orchestrator
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

// Orchestrator state management
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

// Main orchestrator interface
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

  // State and lifecycle
  getState(): OrchestratorState;
  shutdown(): Promise<void>;
}

// Strategy manager interface
export interface IInteractionStrategyManager {
  determineStrategy(context: StrategyContext): StrategyDecision;
  applyStrategy(
    strategy: InteractionStrategy,
    context: StrategyContext,
  ): Record<string, unknown>;
  getStrategyWeights(context: StrategyContext): StrategyWeight[];
  registerStrategy(config: InteractionStrategyConfig): void;
  updateStrategyWeights(
    updates: Partial<Record<InteractionStrategy, number>>,
  ): void;
}

// Mention handler interface
export interface IMentionHandler {
  detectMentions(
    message: Message,
    participants: AIParticipant[],
  ): MentionContext;
  findAIByAlias(
    alias: string,
    participants: AIParticipant[],
  ): AIParticipant | undefined;
  normalizeAlias(alias: string): string;
  addMentionToResponse(response: string, targetAI: AIParticipant): string;
  getMentionTokenForAI(ai: AIParticipant): string;
}

// Response scheduler interface
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

// Background conversation manager interface
export interface IBackgroundConversationManager {
  start(participants: AIParticipant[]): void;
  stop(): void;
  handleSilence(silenceDurationMs: number): void;
  putParticipantsToSleep(participants: AIParticipant[]): void;
  wakeUpParticipants(participants?: AIParticipant[]): void;
  shouldTriggerBackground(silenceDurationMs: number): boolean;
  getState(): BackgroundConversationState;
}

// System prompt builder interface
export interface ISystemPromptBuilder {
  buildPrompt(
    basePrompt: string,
    context: PromptContext,
    participant: AIParticipant,
  ): string;

  enhanceContextForStrategy(
    context: string,
    strategy: InteractionStrategy,
  ): string;

  enhanceContextForTopicChange(
    context: string,
    newTopic: string,
    previousTopic?: string,
  ): string;

  enhanceContextForComment(context: string, comment: string): string;

  truncateResponse(response: string, maxLength: number): string;
}

// Error types specific to orchestrator
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

// Utility types for orchestrator
export type ParticipantStatus = "active" | "sleeping" | "inactive" | "error";

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

// Message Broker types
export interface MessageBrokerConfig {
  maxQueueSize: number;
  processingDelayMs: number;
  defaultUserPriority: number;
  defaultAIPriority: number;
  enablePriorityQueuing: boolean;
}

export interface QueuedMessage extends Message {
  priority: number;
  queuedAt: number;
}

export interface QueueStatus {
  queueLength: number;
  isProcessing: boolean;
  nextMessage: QueuedMessage | null;
  maxQueueSize: number;
  utilizationPercent: number;
}

export type BrokerEvent =
  | "message-queued"
  | "message-ready"
  | "message-error"
  | "message"
  | "broadcast"
  | "processing-started"
  | "processing-completed"
  | "processing-paused"
  | "processing-resumed"
  | "queue-cleared"
  | "queue-trimmed"
  | "messages-removed"
  | "error";

export interface IMessageBroker extends EventEmitter {
  enqueueMessage(message: Message, priority?: number): void;
  processQueue(): Promise<void>;
  broadcastMessage(message: Message, roomId?: string): void;
  getQueueStatus(): QueueStatus;
  clearQueue(): void;
  getQueuedMessagesForRoom(roomId: string): QueuedMessage[];
  updateConfig(config: Partial<MessageBrokerConfig>): void;
  getConfig(): MessageBrokerConfig;
  getMetrics(): Record<string, unknown>;
  pauseProcessing(): void;
  resumeProcessing(): void;
  removeMessages(predicate: (message: QueuedMessage) => boolean): number;
}

// Context Manager types
export interface ContextMessage extends Message {
  importance?: number;
  tokens?: number;
  sender?: string;
  senderType?: "user" | "ai" | "system";
  displayName?: string;
  alias?: string;
  normalizedAlias?: string;
  aiId?: string;
  providerKey?: string;
  modelKey?: string;
  mentions?: string[];
  mentionsNormalized?: string[];
  isInternal?: boolean;
}

export interface ContextManagerConfig {
  maxMessages: number;
  maxTokens?: number;
  prioritizeRecent?: boolean;
  includeSystemMessages?: boolean;
  includeMetadata?: boolean;
  preserveMentions?: boolean;
}

export interface IContextManager {
  addMessage(message: Message): void;
  getContext(maxMessages?: number): ContextMessage[];
  clear(): void;
  updateConfig(config: Partial<ContextManagerConfig>): void;
  getConfig(): ContextManagerConfig;
  size(): number;
  hasMessages(): boolean;
}

// Type guards
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

export const isMentionData = (obj: unknown): obj is MentionData => {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "type" in obj &&
    "originalText" in obj &&
    typeof (obj as MentionData).originalText === "string"
  );
};

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

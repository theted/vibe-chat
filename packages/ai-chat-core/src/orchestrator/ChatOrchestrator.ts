/**
 * Chat Orchestrator - Manages multi-AI conversations
 */

import { EventEmitter } from "events";
import { DEFAULT_ROOM_ID, normalizeRoomId } from "@ai-chat/ai-configs";
import { AIRegistry } from "./AIRegistry.js";
import { AIStreakTracker, type RoomAIStatus } from "./AIStreakTracker.js";
import type { AIInitConfig, ModelInitResult } from "./AIRegistry.js";
import { ContextManager } from "./ContextManager.js";
import { MessageBroker } from "./MessageBroker.js";
import { ResponseQueue } from "./ResponseQueue.js";
import type { GenerateResponseOptions } from "./ResponseQueue.js";
import { RoomScope } from "./RoomScope.js";
import { ResponseScheduler } from "./ResponseScheduler.js";
import { ResponseGenerator } from "./ResponseGenerator.js";
import { BackgroundConversationLoop } from "./BackgroundConversationLoop.js";
import { DEFAULTS } from "./constants.js";
import type { ContextMessage } from "@/types/orchestrator.js";
import {
  findAIByNormalizedAlias,
  findAIFromContextMessage,
  getAIDisplayName,
  getMentionTokenForAI,
  OrchestratorAIService,
} from "@/utils/orchestrator/aiLookup.js";
import { limitMentionsInResponse } from "@/utils/orchestrator/mentionUtils.js";
import { createEnhancedSystemPrompt } from "@/utils/orchestrator/promptBuilder.js";
import { determineInteractionStrategy } from "@/utils/orchestrator/strategyUtils.js";
import { getEnvFlag, parseBooleanEnvFlag } from "@/utils/stringUtils.js";

type ChatOrchestratorOptions = {
  maxMessages?: number;
  maxAIMessages?: number;
  maxConcurrentResponses?: number;
  minUserResponseDelay?: number;
  maxUserResponseDelay?: number;
  minBackgroundDelay?: number;
  maxBackgroundDelay?: number;
  minDelayBetweenAI?: number;
  maxDelayBetweenAI?: number;
  verboseContextLogging?: boolean;
};

/**
 * Orchestrates multi-AI conversations and background scheduling.
 */
export class ChatOrchestrator extends EventEmitter {
  private registry: AIRegistry;
  contextManager: ContextManager;
  messageBroker: MessageBroker;
  /** When an AI last posted in the default room (drives background chatter). */
  lastAIMessageTime: number;
  minUserResponseDelay: number;
  maxUserResponseDelay: number;
  minBackgroundDelay: number;
  maxBackgroundDelay: number;
  minDelayBetweenAI: number;
  maxDelayBetweenAI: number;
  verboseContextLogging: boolean;
  private responseQueue: ResponseQueue;
  private roomScope: RoomScope;
  private scheduler: ResponseScheduler;
  private generator: ResponseGenerator;
  private backgroundLoop: BackgroundConversationLoop;
  private streak: AIStreakTracker;
  /** Rooms waiting for an outside responder (@Chat) to post its answer. */
  private heldRooms = new Set<string>();

  constructor(options: ChatOrchestratorOptions = {}) {
    super();
    this.contextManager = new ContextManager(
      options.maxMessages || DEFAULTS.MAX_MESSAGES,
    );
    this.messageBroker = new MessageBroker();
    this.registry = new AIRegistry();
    this.streak = new AIStreakTracker(
      options.maxAIMessages || DEFAULTS.MAX_AI_MESSAGES,
      {
        onSleep: (roomId, reason) =>
          this.emit("ais-sleeping", { roomId, reason }),
        onWake: (roomId) => this.emit("ais-awakened", { roomId }),
        onChange: (status) => this.emit("ai-status-changed", status),
      },
    );
    this.lastAIMessageTime = 0;
    this.minUserResponseDelay =
      options.minUserResponseDelay || DEFAULTS.MIN_USER_RESPONSE_DELAY;
    this.maxUserResponseDelay =
      options.maxUserResponseDelay || DEFAULTS.MAX_USER_RESPONSE_DELAY;
    this.minBackgroundDelay =
      options.minBackgroundDelay || DEFAULTS.MIN_BACKGROUND_DELAY;
    this.maxBackgroundDelay =
      options.maxBackgroundDelay || DEFAULTS.MAX_BACKGROUND_DELAY;
    this.minDelayBetweenAI =
      options.minDelayBetweenAI || DEFAULTS.MIN_DELAY_BETWEEN_AI;
    this.maxDelayBetweenAI =
      options.maxDelayBetweenAI || DEFAULTS.MAX_DELAY_BETWEEN_AI;

    this.roomScope = new RoomScope();

    this.generator = new ResponseGenerator({
      registry: this.registry,
      contextManager: this.contextManager,
      emit: (event, payload) => this.emit(event, payload),
      enqueueMessage: (message) => this.messageBroker.enqueueMessage(message),
      onResponseComplete: (roomId) =>
        this.responseQueue.onResponseComplete(roomId),
      canSpeak: (roomId) => this.streak.canSpeak(roomId),
      claimTurn: (roomId) => this.streak.claim(roomId),
      getFatigue: (roomId) => this.streak.getFatigue(roomId),
      isDirectOnly: (roomId) => this.isRoomDirectOnly(roomId),
      getRoomAIs: (roomId) =>
        this.filterAIsForRoom(roomId, this.activeAIs)
          .map((aiId) => this.aiServices.get(aiId))
          .filter((ai): ai is OrchestratorAIService => Boolean(ai)),
      isVerbose: () => this.verboseContextLogging,
    });

    this.responseQueue = new ResponseQueue({
      maxConcurrent:
        options.maxConcurrentResponses || DEFAULTS.MAX_CONCURRENT_RESPONSES,
      // A room that hit its limit since scheduling drops what it had queued
      canDispatch: ({ roomId }) => this.streak.canSpeak(roomId),
      onDispatch: (aiId, roomId, isUserResponse, opts) =>
        this.generateAIResponse(aiId, roomId, isUserResponse, opts),
    });

    this.scheduler = new ResponseScheduler({
      registry: this.registry,
      getLastMessage: (roomId) =>
        this.contextManager.getLastMessage(roomId) ?? undefined,
      filterAIsForRoom: (roomId, aiIds) => this.filterAIsForRoom(roomId, aiIds),
      isDirectOnly: (roomId) => this.isRoomDirectOnly(roomId),
      isOnHold: (roomId) => this.heldRooms.has(roomId),
      getAvailableBudget: (roomId) =>
        this.streak.remaining(roomId) - this.responseQueue.countForRoom(roomId),
      getFatigue: (roomId) => this.streak.getFatigue(roomId),
      enqueueBatch: (responses) => this.responseQueue.enqueueBatch(responses),
      findPending: (roomId, aiId) =>
        this.responseQueue.findPending(roomId, aiId),
      retarget: (pending, update) =>
        this.responseQueue.retarget(pending, update),
      getDelays: () => ({
        minUserResponseDelay: this.minUserResponseDelay,
        maxUserResponseDelay: this.maxUserResponseDelay,
        minBackgroundDelay: this.minBackgroundDelay,
        maxBackgroundDelay: this.maxBackgroundDelay,
        minDelayBetweenAI: this.minDelayBetweenAI,
        maxDelayBetweenAI: this.maxDelayBetweenAI,
      }),
    });

    // Background chatter only ever happens in the shared default room
    this.backgroundLoop = new BackgroundConversationLoop({
      isAsleep: () => !this.streak.canSpeak(DEFAULT_ROOM_ID),
      hasActiveAIs: () => this.activeAIs.length > 0,
      getLastAIMessageTime: () => this.lastAIMessageTime,
      triggerBackgroundResponses: () =>
        this.scheduler.schedule(DEFAULT_ROOM_ID, false),
      triggerReopening: () =>
        this.scheduler.schedule(DEFAULT_ROOM_ID, false, { isReopening: true }),
      getDelays: () => ({
        minBackgroundDelay: this.minBackgroundDelay,
        maxBackgroundDelay: this.maxBackgroundDelay,
      }),
    });

    const envVerboseFlag = parseBooleanEnvFlag(
      getEnvFlag("AI_CHAT_VERBOSE_CONTEXT"),
    );
    this.verboseContextLogging =
      typeof options.verboseContextLogging === "boolean"
        ? options.verboseContextLogging
        : envVerboseFlag;

    this.setupMessageBroker();
    this.startBackgroundConversation();
  }

  /** Live AI service map (mutated directly by some callers). */
  get aiServices(): Map<string, OrchestratorAIService> {
    return this.registry.services;
  }

  /** Live list of active AI ids. */
  get activeAIs(): string[] {
    return this.registry.activeIds;
  }

  setupMessageBroker() {
    this.messageBroker.on("message-ready", (message) => {
      this.handleMessage(message);
    });

    this.messageBroker.on("broadcast", ({ message, roomId }) => {
      this.emit("message-broadcast", { message, roomId });
    });

    this.messageBroker.on("message-error", ({ message, error }) => {
      this.emit("error", { message, error });
    });
  }

  async initializeAIs(
    aiConfigs: AIInitConfig[],
    options?: { skipHealthCheck?: boolean },
  ): Promise<ModelInitResult[]> {
    const skipHealthCheck =
      options?.skipHealthCheck ??
      parseBooleanEnvFlag(getEnvFlag("AI_CHAT_SKIP_HEALTHCHECK"));
    return this.registry.initialize(aiConfigs, { skipHealthCheck });
  }

  /**
   * Remove an AI service from the orchestrator (e.g. after a failed
   * background health check). Returns true if the service existed.
   */
  removeAI(aiId: string): boolean {
    this.responseQueue.removeWhere((response) => response.aiId === aiId);
    return this.registry.remove(aiId);
  }

  async handleMessage(message: ContextMessage) {
    const stored = this.contextManager.addMessage(message);

    if (stored?.senderType === "user") {
      this.handleUserMessage(stored, message.suppressAIResponses);
    } else if (stored?.senderType === "ai") {
      this.handleAIMessage(stored);
    }

    this.messageBroker.broadcastMessage(message, message.roomId);
  }

  /**
   * A person posted: the room gets a fresh AI budget, replies still queued
   * for older messages are dropped (the new round takes over), and a new
   * round is scheduled - unless @Chat is taking this one.
   */
  private handleUserMessage(
    message: ContextMessage,
    suppressAIResponses = false,
  ) {
    const roomId = normalizeRoomId(message.roomId);
    this.streak.recordHumanMessage(roomId);
    if (!this.backgroundLoop.isRunning) {
      this.startBackgroundConversation();
    }

    // Replies someone explicitly asked for (@mentions) survive
    this.responseQueue.removeWhere(
      (response) => response.roomId === roomId && !response.options.isMentioned,
    );

    if (suppressAIResponses) {
      console.info(
        "[ChatAssistant] Suppressing AI responses for this message (handled by @Chat).",
      );
      return;
    }

    this.scheduler.schedule(roomId, true, { trigger: message });
  }

  /** An AI posted: whoever it @mentioned answers it. */
  private handleAIMessage(message: ContextMessage) {
    const roomId = normalizeRoomId(message.roomId);
    if (roomId === DEFAULT_ROOM_ID) {
      this.lastAIMessageTime = Date.now();
    }
    this.scheduler.scheduleMentionReplies(roomId, message);
  }

  /** Schedule a round of replies to the room's latest message. */
  scheduleAIResponses(roomId: string | undefined, isUserResponse = true) {
    this.scheduler.schedule(normalizeRoomId(roomId), isUserResponse);
  }

  /** How close a room's AI-message budget is to running out, 0..1. */
  getFatigue(roomId?: string): number {
    return this.streak.getFatigue(normalizeRoomId(roomId));
  }

  async generateAIResponse(
    aiId: string,
    roomId: string,
    isUserResponse = true,
    options: GenerateResponseOptions = {},
  ) {
    return this.generator.generate(aiId, roomId, isUserResponse, options);
  }

  // --- Room AI filtering ---

  setRoomAllowedAIs(roomId: string, aiIds: string[]): void {
    this.roomScope.setAllowed(roomId, aiIds);
  }

  clearRoomAllowedAIs(roomId: string): void {
    this.roomScope.clear(roomId);
  }

  /**
   * Mark a room as a 1-1 chat: exactly one reply per user message, and no
   * unprompted background chatter. Pair it with setRoomAllowedAIs.
   */
  setRoomDirectOnly(roomId: string, directOnly = true): void {
    this.roomScope.setDirectOnly(roomId, directOnly);
  }

  isRoomDirectOnly(roomId: string): boolean {
    return this.roomScope.isDirectOnly(roomId);
  }

  filterAIsForRoom(roomId: string, aiIds: string[]): string[] {
    return this.roomScope.filter(roomId, aiIds);
  }

  // --- Delegate lookups (convenience wrappers used by tests and external callers) ---

  findAIByNormalizedAlias(normalizedAlias: string | null | undefined) {
    return findAIByNormalizedAlias(this.aiServices, normalizedAlias);
  }

  getAIDisplayName(aiService: OrchestratorAIService | null) {
    return getAIDisplayName(aiService);
  }

  getMentionTokenForAI(ai: OrchestratorAIService | null) {
    return getMentionTokenForAI(ai);
  }

  createEnhancedSystemPrompt(
    aiService: OrchestratorAIService,
    context: ContextMessage[],
    isUserResponse: boolean,
  ) {
    return createEnhancedSystemPrompt(
      aiService,
      context,
      isUserResponse,
      this.aiServices,
    );
  }

  determineInteractionStrategy(
    aiService: OrchestratorAIService,
    context: ContextMessage[],
    isUserResponse: boolean,
  ) {
    return determineInteractionStrategy(
      aiService,
      context,
      isUserResponse,
      (message) => findAIFromContextMessage(this.aiServices, message),
      (ai) => getMentionTokenForAI(ai),
    );
  }

  limitMentionsInResponse(response: string) {
    return limitMentionsInResponse(response);
  }

  // --- AI message budget (see AIStreakTracker) ---

  /**
   * Reserve one AI message in the room for a responder outside the
   * orchestrator (@Chat). False means the room is at its limit: don't post.
   */
  claimAITurn(roomId?: string): boolean {
    return this.streak.claim(normalizeRoomId(roomId));
  }

  canAIsSpeak(roomId?: string): boolean {
    return this.streak.canSpeak(normalizeRoomId(roomId));
  }

  /**
   * While @Chat works on an answer, AIs don't start rounds of their own in
   * the room - otherwise one of them answers the question meant for @Chat.
   * Replies to people still go out.
   */
  setRoomOnHold(roomId: string | undefined, onHold: boolean): void {
    const room = normalizeRoomId(roomId);
    if (onHold) {
      this.heldRooms.add(room);
    } else {
      this.heldRooms.delete(room);
    }
  }

  getRoomAIStatus(roomId?: string): RoomAIStatus {
    return this.streak.getStatus(normalizeRoomId(roomId));
  }

  /** Reset and wake one room, or every room the orchestrator has seen. */
  wakeUpAIs(roomId?: string) {
    for (const room of this.targetRooms(roomId)) {
      this.streak.wake(room);
    }
    if (!this.backgroundLoop.isRunning) {
      this.startBackgroundConversation();
    }
  }

  /** Silence one room, or every room the orchestrator has seen. */
  putAIsToSleep(roomId?: string, reason = "manual") {
    for (const room of this.targetRooms(roomId)) {
      this.streak.sleep(room, reason);
    }
  }

  private targetRooms(roomId?: string): string[] {
    if (roomId !== undefined) return [normalizeRoomId(roomId)];
    return Array.from(new Set([DEFAULT_ROOM_ID, ...this.streak.knownRoomIds]));
  }

  // --- Public API ---

  addMessage(message: ContextMessage) {
    this.messageBroker.enqueueMessage(message);
  }

  changeTopic(newTopic: string, changedBy: string, roomId?: string) {
    const topicMessage: ContextMessage = {
      sender: "System",
      content: `Topic changed to: "${newTopic}" by ${changedBy}`,
      senderType: "system",
      roomId,
      priority: 1000,
    };
    this.addMessage(topicMessage);
    this.emit("topic-changed", { newTopic, changedBy, roomId });
  }

  getStatus() {
    return {
      aiServices: this.aiServices.size,
      activeAIs: this.activeAIs.length,
      maxAIMessages: this.streak.maxMessages,
      rooms: this.streak.getAllStatuses(),
      pendingResponses: this.responseQueue.pendingCount,
      activeResponses: this.responseQueue.activeResponseCount,
      contextSize: this.contextManager.size(),
      queueStatus: this.messageBroker.getQueueStatus(),
    };
  }

  /** Responses currently generating (bounded by maxConcurrentResponses). */
  get activeResponseCount(): number {
    return this.responseQueue.activeResponseCount;
  }

  // --- Background conversation ---

  startBackgroundConversation() {
    this.backgroundLoop.start();
  }

  stopBackgroundConversation() {
    this.backgroundLoop.stop();
  }

  cleanup() {
    this.backgroundLoop.stop();
    this.messageBroker.removeAllListeners();
    this.removeAllListeners();
    this.registry.clear();
    this.contextManager.clear();
    this.messageBroker.clearQueue();
    this.responseQueue.clear();
    this.streak.clear();
    this.heldRooms.clear();
  }
}

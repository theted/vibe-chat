/**
 * Chat Orchestrator - Manages multi-AI conversations
 */

import { EventEmitter } from "events";
import { AIRegistry } from "./AIRegistry.js";
import type { ModelInitResult } from "./AIRegistry.js";
import { ContextManager } from "./ContextManager.js";
import { MessageBroker } from "./MessageBroker.js";
import { ResponseQueue } from "./ResponseQueue.js";
import type { GenerateResponseOptions } from "./ResponseQueue.js";
import { RoomScope } from "./RoomScope.js";
import { ResponseScheduler } from "./ResponseScheduler.js";
import { ResponseGenerator } from "./ResponseGenerator.js";
import { BackgroundConversationLoop } from "./BackgroundConversationLoop.js";
import { DEFAULTS } from "./constants.js";
import {
  findAIByNormalizedAlias,
  findAIFromContextMessage,
  getAIDisplayName,
  getMentionTokenForAI,
  OrchestratorAIService,
} from "@/utils/orchestrator/aiLookup.js";
import {
  addMentionToResponse,
  limitMentionsInResponse,
} from "@/utils/orchestrator/mentionUtils.js";
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
  messageTracker: {
    aiMessageCount: number;
    maxAIMessages: number;
    isAsleep: boolean;
  };
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

  constructor(options: ChatOrchestratorOptions = {}) {
    super();
    this.contextManager = new ContextManager(
      options.maxMessages || DEFAULTS.MAX_MESSAGES,
    );
    this.messageBroker = new MessageBroker();
    this.registry = new AIRegistry();
    this.messageTracker = {
      aiMessageCount: 0,
      maxAIMessages: options.maxAIMessages || DEFAULTS.MAX_AI_MESSAGES,
      isAsleep: false,
    };
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
      enqueueMessage: (message) => this.messageBroker.enqueueMessage(message as any),
      onResponseComplete: () => this.responseQueue.onResponseComplete(),
      isAsleep: () => this.messageTracker.isAsleep,
      getFatigue: () => this.getFatigue(),
      isVerbose: () => this.verboseContextLogging,
    });

    this.responseQueue = new ResponseQueue({
      maxConcurrent: options.maxConcurrentResponses || DEFAULTS.MAX_CONCURRENT_RESPONSES,
      isSleeping: () => this.messageTracker.isAsleep,
      onDispatch: (aiId, roomId, isUserResponse, opts) =>
        this.generateAIResponse(aiId, roomId, isUserResponse, opts),
    });

    this.scheduler = new ResponseScheduler({
      registry: this.registry,
      getLastMessage: () => this.contextManager.getLastMessage(),
      filterAIsForRoom: (roomId, aiIds) => this.filterAIsForRoom(roomId, aiIds),
      enqueueBatch: (responses) => this.responseQueue.enqueueBatch(responses),
      isAsleep: () => this.messageTracker.isAsleep,
      getFatigue: () => this.getFatigue(),
      getDelays: () => ({
        minUserResponseDelay: this.minUserResponseDelay,
        maxUserResponseDelay: this.maxUserResponseDelay,
        minBackgroundDelay: this.minBackgroundDelay,
        maxBackgroundDelay: this.maxBackgroundDelay,
        minDelayBetweenAI: this.minDelayBetweenAI,
        maxDelayBetweenAI: this.maxDelayBetweenAI,
      }),
    });

    this.backgroundLoop = new BackgroundConversationLoop({
      isAsleep: () => this.messageTracker.isAsleep,
      hasActiveAIs: () => this.activeAIs.length > 0,
      getLastAIMessageTime: () => this.lastAIMessageTime,
      triggerBackgroundResponses: () => this.scheduleAIResponses("default", false),
      triggerReopening: () =>
        this.scheduler.schedule("default", false, { isReopening: true }),
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
    aiConfigs,
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
    return this.registry.remove(aiId);
  }

  async handleMessage(message) {
    this.contextManager.addMessage(message);
    this.updateJustRespondedFlags(message);

    if (message.senderType === "user") {
      await this.handleUserMessage(message);
    } else {
      await this.handleAIMessage(message);
    }

    this.messageBroker.broadcastMessage(message, message.roomId);
  }

  /**
   * Track which AI spoke last so background scheduling can skip it -
   * prevents the same AI posting twice in a row without anyone replying.
   */
  updateJustRespondedFlags(message) {
    const senderAIId = message.senderType === "ai" ? message.aiId : null;
    for (const ai of this.aiServices.values()) {
      ai.justResponded = ai.id === senderAIId;
    }
  }

  async handleUserMessage(message) {
    this.wakeUpAIs();

    if (message?.suppressAIResponses) {
      console.info(
        "[ChatAssistant] Suppressing AI responses for this message (handled by @Chat).",
      );
      return;
    }

    this.scheduleAIResponses(message.roomId);
  }

  async handleAIMessage(message) {
    this.lastAIMessageTime = Date.now();

    if (this.messageTracker.isAsleep) return;

    this.messageTracker.aiMessageCount++;
    if (this.messageTracker.aiMessageCount >= this.messageTracker.maxAIMessages) {
      this.putAIsToSleep();
    }
  }

  scheduleAIResponses(roomId, isUserResponse = true) {
    this.scheduler.schedule(roomId, isUserResponse);
  }

  /** How close the AI-message budget is to running out, 0..1. */
  getFatigue(): number {
    if (this.messageTracker.maxAIMessages <= 0) return 0;
    return Math.min(
      this.messageTracker.aiMessageCount / this.messageTracker.maxAIMessages,
      1,
    );
  }

  async generateAIResponse(
    aiId,
    roomId,
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

  filterAIsForRoom(roomId: string, aiIds: string[]): string[] {
    return this.roomScope.filter(roomId, aiIds);
  }

  // --- Delegate lookups (convenience wrappers used by tests and external callers) ---

  findAIByNormalizedAlias(normalizedAlias) {
    return findAIByNormalizedAlias(this.aiServices, normalizedAlias);
  }

  getAIDisplayName(aiService) {
    return getAIDisplayName(aiService);
  }

  getMentionTokenForAI(ai) {
    return getMentionTokenForAI(ai);
  }

  createEnhancedSystemPrompt(aiService, context, isUserResponse) {
    return createEnhancedSystemPrompt(aiService, context, isUserResponse, this.aiServices);
  }

  determineInteractionStrategy(aiService, context, isUserResponse) {
    return determineInteractionStrategy(
      aiService,
      context,
      isUserResponse,
      (message) => findAIFromContextMessage(this.aiServices, message),
      (ai) => getMentionTokenForAI(ai),
    );
  }

  addMentionToResponse(response, targetAI) {
    return addMentionToResponse(this.aiServices, response, targetAI);
  }

  limitMentionsInResponse(response) {
    return limitMentionsInResponse(response);
  }

  // --- Sleep / wake ---

  wakeUpAIs() {
    this.messageTracker.aiMessageCount = 0;
    this.messageTracker.isAsleep = false;
    this.emit("ais-awakened");

    if (!this.backgroundLoop.isRunning) {
      this.startBackgroundConversation();
    }
  }

  putAIsToSleep() {
    this.messageTracker.isAsleep = true;
    this.emit("ais-sleeping", { reason: "message-limit-reached" });
  }

  // --- Public API ---

  addMessage(message) {
    this.messageBroker.enqueueMessage(message as any);
  }

  changeTopic(newTopic, changedBy, roomId) {
    const topicMessage = {
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
      messageTracker: { ...this.messageTracker },
      contextSize: this.contextManager.size(),
      queueStatus: this.messageBroker.getQueueStatus(),
    };
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
  }
}

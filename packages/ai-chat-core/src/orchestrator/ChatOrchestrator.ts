/**
 * Chat Orchestrator - Manages multi-AI conversations
 */

import { EventEmitter } from "events";
import { AIServiceFactory } from "@/services/AIServiceFactory.js";
import { ContextManager } from "./ContextManager.js";
import { MessageBroker } from "./MessageBroker.js";
import { ResponseQueue } from "./ResponseQueue.js";
import type { GenerateResponseOptions } from "./ResponseQueue.js";
import type { ContextMessage } from "@/types/orchestrator.js";
import {
  DEFAULTS,
  CONTEXT_LIMITS,
  TIMING,
  RESPONDER_CONFIG,
} from "./constants.js";
import {
  findAIByNormalizedAlias,
  findAIFromContextMessage,
  getAIDisplayName,
  getMentionTokenForAI,
  OrchestratorAIService,
} from "@/utils/orchestrator/aiLookup.js";
import {
  enhanceContextForComment,
  enhanceContextForTopicChange,
} from "@/utils/orchestrator/contextEnhancers.js";
import { logAIContext } from "@/utils/orchestrator/logging.js";
import {
  addMentionToResponse,
  limitMentionsInResponse,
} from "@/utils/orchestrator/mentionUtils.js";
import { createEnhancedSystemPrompt } from "@/utils/orchestrator/promptBuilder.js";
import {
  calculateResponseDelay,
  selectRespondingAIs,
} from "@/utils/orchestrator/responseScheduling.js";
import { truncateResponse } from "@/utils/orchestrator/responseUtils.js";
import {
  applyInteractionStrategy,
  determineInteractionStrategy,
} from "@/utils/orchestrator/strategyUtils.js";
import {
  getEnvFlag,
  normalizeAlias,
  parseBooleanEnvFlag,
  toMentionAlias,
} from "@/utils/stringUtils.js";

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
  topicChangeChance?: number;
  verboseContextLogging?: boolean;
};

const MAX_PARALLEL_AI_INITIALIZATIONS = 8;

/**
 * Run async tasks with a concurrency limit.
 */
const runWithConcurrencyLimit = async (
  tasks: Array<() => Promise<void>>,
  limit: number,
): Promise<void> => {
  if (tasks.length === 0) return;

  const concurrency = Math.max(1, limit);
  let nextIndex = 0;
  const workerCount = Math.min(concurrency, tasks.length);

  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      const task = tasks[currentIndex];
      if (!task) return;
      await task();
    }
  });

  await Promise.all(workers);
};

/**
 * Orchestrates multi-AI conversations and background scheduling.
 */
export class ChatOrchestrator extends EventEmitter {
  contextManager: ContextManager;
  messageBroker: MessageBroker;
  aiServices: Map<string, OrchestratorAIService>;
  activeAIs: string[];
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
  backgroundConversationTimer: NodeJS.Timeout | null;
  topicChangeChance: number;
  verboseContextLogging: boolean;
  private responseQueue: ResponseQueue;
  private roomAllowedAIs: Map<string, Set<string>>;

  constructor(options: ChatOrchestratorOptions = {}) {
    super();
    this.contextManager = new ContextManager(
      options.maxMessages || DEFAULTS.MAX_MESSAGES,
    );
    this.messageBroker = new MessageBroker();
    this.aiServices = new Map();
    this.activeAIs = [];
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

    this.backgroundConversationTimer = null;
    this.topicChangeChance =
      options.topicChangeChance || DEFAULTS.TOPIC_CHANGE_CHANCE;
    this.roomAllowedAIs = new Map();

    this.responseQueue = new ResponseQueue({
      maxConcurrent: options.maxConcurrentResponses || DEFAULTS.MAX_CONCURRENT_RESPONSES,
      isSleeping: () => this.messageTracker.isAsleep,
      onDispatch: (aiId, roomId, isUserResponse, opts) =>
        this.generateAIResponse(aiId, roomId, isUserResponse, opts),
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

  async initializeAIs(aiConfigs) {
    const failedConfigs = [];
    const skipHealthCheck = parseBooleanEnvFlag(
      getEnvFlag("AI_CHAT_SKIP_HEALTHCHECK"),
    );
    const tasks = aiConfigs.map((config) => async () => {
      try {
        const service = AIServiceFactory.createServiceByName(
          config.providerKey,
          config.modelKey,
        );
        await service.initialize({ validateOnInit: !skipHealthCheck });

        const aiId = `${config.providerKey}_${config.modelKey}`;
        const displayName =
          config.displayName || `${service.getName()} ${service.getModel()}`;
        const rawAlias = config.alias || displayName;
        const alias = toMentionAlias(rawAlias, displayName);
        const emoji = config.emoji || "🤖";

        this.aiServices.set(aiId, {
          service,
          config,
          id: aiId,
          name: service.getName(),
          displayName,
          displayAlias: rawAlias,
          alias,
          normalizedAlias: normalizeAlias(alias),
          emoji,
          isActive: true,
          lastMessageTime: 0,
        });

        this.activeAIs.push(aiId);
      } catch (error) {
        console.error(
          `Failed to initialize AI ${config.providerKey}_${config.modelKey}:`,
          error,
        );
        failedConfigs.push({
          providerKey: config.providerKey,
          modelKey: config.modelKey,
          displayName: config.displayName,
          alias: config.alias,
        });
      }
    });

    await runWithConcurrencyLimit(tasks, MAX_PARALLEL_AI_INITIALIZATIONS);

    console.log(`Initialized ${this.aiServices.size} AI services`);

    if (failedConfigs.length > 0) {
      console.warn(
        `⚠️  ${failedConfigs.length} AI model(s) failed to initialize:`,
      );
      failedConfigs.forEach((failed) => {
        const label =
          failed.displayName ||
          failed.alias ||
          `${failed.providerKey}_${failed.modelKey}`;
        console.warn(
          `   • ${label} (${failed.providerKey}_${failed.modelKey})`,
        );
      });
    }
  }

  async handleMessage(message) {
    this.contextManager.addMessage(message);

    if (message.senderType === "user") {
      await this.handleUserMessage(message);
    } else {
      await this.handleAIMessage(message);
    }

    this.messageBroker.broadcastMessage(message, message.roomId);
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
    this.messageTracker.aiMessageCount++;
    this.lastAIMessageTime = Date.now();

    if (
      this.messageTracker.aiMessageCount >= this.messageTracker.maxAIMessages
    ) {
      this.putAIsToSleep();
    }
  }

  scheduleAIResponses(roomId, isUserResponse = true) {
    const roomScopedAIs = this.filterAIsForRoom(roomId, this.activeAIs);

    if (this.messageTracker.isAsleep || roomScopedAIs.length === 0) return;

    const typingAICount = roomScopedAIs.filter((aiId) => {
      const ai = this.aiServices.get(aiId);
      return ai?.isGenerating;
    }).length;

    const eligibleAIs = roomScopedAIs.filter((aiId) => {
      const ai = this.aiServices.get(aiId);
      return (
        ai?.isActive &&
        !ai.isGenerating &&
        (isUserResponse || !ai.justResponded)
      );
    });

    if (eligibleAIs.length === 0) return;

    const activeCount = eligibleAIs.length;
    const baseMaxResponders = isUserResponse
      ? Math.max(
          RESPONDER_CONFIG.USER_RESPONSE_MIN_COUNT,
          Math.ceil(activeCount * RESPONDER_CONFIG.USER_RESPONSE_MAX_MULTIPLIER),
        )
      : Math.max(
          RESPONDER_CONFIG.BACKGROUND_MIN_COUNT,
          Math.ceil(activeCount * RESPONDER_CONFIG.BACKGROUND_MAX_MULTIPLIER),
        );
    const baseMinResponders = isUserResponse
      ? RESPONDER_CONFIG.USER_RESPONSE_MIN_BASE
      : RESPONDER_CONFIG.BACKGROUND_MIN_BASE;

    const lastMessage = this.contextManager.getLastMessage();
    const mentionTargets = new Set(lastMessage?.mentionsNormalized || []);

    const mentionedAIs = eligibleAIs
      .map((aiId) => this.aiServices.get(aiId))
      .filter((ai) => ai && mentionTargets.has(ai.normalizedAlias))
      .map((ai) => ai.id);

    const uniqueMentioned = Array.from(new Set(mentionedAIs));

    const finalMin = Math.max(baseMinResponders, uniqueMentioned.length || baseMinResponders);
    const finalMax = Math.max(baseMaxResponders, finalMin);

    const availableForRandom = eligibleAIs.filter(
      (aiId) => !uniqueMentioned.includes(aiId),
    );

    const minAdditional = Math.max(finalMin - uniqueMentioned.length, 0);
    const maxAdditional = Math.max(finalMax - uniqueMentioned.length, 0);

    const additionalResponders =
      maxAdditional > 0
        ? selectRespondingAIs(
            this.aiServices,
            this.activeAIs,
            minAdditional,
            maxAdditional,
            availableForRandom,
          )
        : [];

    const responders = [...uniqueMentioned, ...additionalResponders];

    const queuedResponses = responders.map((aiId, index) => {
      const isMentioned = uniqueMentioned.includes(aiId);
      const delay = calculateResponseDelay({
        index,
        isUserResponse,
        isMentioned,
        typingAICount,
        minUserResponseDelay: this.minUserResponseDelay,
        maxUserResponseDelay: this.maxUserResponseDelay,
        minBackgroundDelay: this.minBackgroundDelay,
        maxBackgroundDelay: this.maxBackgroundDelay,
        minDelayBetweenAI: this.minDelayBetweenAI,
        maxDelayBetweenAI: this.maxDelayBetweenAI,
      });

      return {
        aiId,
        roomId,
        isUserResponse,
        options: { isMentioned, triggerMessage: lastMessage },
        scheduledTime: Date.now() + delay,
      };
    });

    this.responseQueue.enqueueBatch(queuedResponses);
  }

  async generateAIResponse(
    aiId,
    roomId,
    isUserResponse = true,
    options: GenerateResponseOptions = {},
  ) {
    if (this.messageTracker.isAsleep) return;

    const aiService = this.aiServices.get(aiId);
    if (!aiService?.isActive) return;

    const aiMeta = {
      aiId,
      displayName: aiService.displayName || aiService.name,
      alias: aiService.alias,
      normalizedAlias: aiService.normalizedAlias,
      emoji: aiService.emoji,
      providerKey: aiService.config?.providerKey,
      modelKey: aiService.config?.modelKey,
      roomId,
      isUserResponse,
      isMentioned: options.isMentioned || false,
    };

    this.emit("ai-generating-start", aiMeta);
    aiService.isGenerating = true;
    const responseStartTime = Date.now();

    try {
      console.log(
        `🤖 ${aiService.name} is generating ${
          isUserResponse ? "user response" : "background message"
        }...`,
      );

      let context = this.contextManager.getContextForAI(CONTEXT_LIMITS.AI_CONTEXT_SIZE);
      const interactionStrategy = determineInteractionStrategy(
        aiService,
        context,
        isUserResponse,
        (message) => findAIFromContextMessage(this.aiServices, message),
        (ai) => getMentionTokenForAI(ai),
      );

      context = applyInteractionStrategy(
        context,
        interactionStrategy,
        aiService,
        context[context.length - 1],
      );

      const systemPrompt = createEnhancedSystemPrompt(
        aiService,
        context,
        isUserResponse,
        this.aiServices,
      );
      const systemMessage: ContextMessage = {
        role: "system",
        content: systemPrompt,
        senderType: "system",
        isInternal: true,
      };
      const messagesWithSystem = [systemMessage, ...context];

      logAIContext(aiService, messagesWithSystem, this.verboseContextLogging);

      const response =
        await aiService.service.generateResponse(messagesWithSystem);
      const responseTimeMs = Date.now() - responseStartTime;
      let processedResponse = truncateResponse(response);
      aiService.lastMessageTime = Date.now();

      if (interactionStrategy.shouldMention && interactionStrategy.targetAI) {
        processedResponse = addMentionToResponse(
          this.aiServices,
          processedResponse,
          interactionStrategy.targetAI,
        );
      }

      processedResponse = limitMentionsInResponse(processedResponse);

      console.log(
        `✨ ${aiService.name} ${interactionStrategy.type}: ${processedResponse.substring(0, 100)}${processedResponse.length > 100 ? "..." : ""}`,
      );

      const aiMessage = {
        sender: aiService.displayName || aiService.name,
        displayName: aiService.displayName || aiService.name,
        alias: aiService.alias,
        normalizedAlias: aiService.normalizedAlias,
        content: processedResponse,
        senderType: "ai",
        roomId,
        aiId,
        aiName: aiService.displayName || aiService.name,
        modelKey: aiService.config?.modelKey,
        modelId: aiService.service?.getModel?.() || aiService.config?.modelKey,
        providerKey: aiService.config?.providerKey,
        mentionsTriggerMessageId:
          options.isMentioned && options.triggerMessage
            ? options.triggerMessage.id
            : null,
        mentionsTriggerSender:
          options.isMentioned && options.triggerMessage
            ? options.triggerMessage.sender
            : null,
        responseType: interactionStrategy.type,
        interactionStrategy: interactionStrategy.type,
        priority: isUserResponse ? 500 : 0,
      };

      this.messageBroker.enqueueMessage(aiMessage as any);
      this.emit("ai-response", { ...aiMeta, responseTimeMs });
    } catch (error) {
      const responseTimeMs = Date.now() - responseStartTime;
      console.error(`❌ AI ${aiId} failed to generate response:`, error.message);
      this.emit("ai-error", { ...aiMeta, aiId, error, responseTimeMs });
    } finally {
      aiService.isGenerating = false;
      this.responseQueue.onResponseComplete();
      this.emit("ai-generating-stop", aiMeta);
    }
  }

  // --- Room AI filtering ---

  setRoomAllowedAIs(roomId: string, aiIds: string[]): void {
    if (!roomId) return;
    const uniqueIds = Array.from(new Set<string>(aiIds.filter(Boolean)));
    if (uniqueIds.length === 0) {
      this.roomAllowedAIs.delete(roomId);
      return;
    }
    this.roomAllowedAIs.set(roomId, new Set<string>(uniqueIds));
  }

  clearRoomAllowedAIs(roomId: string): void {
    this.roomAllowedAIs.delete(roomId);
  }

  filterAIsForRoom(roomId: string, aiIds: string[]): string[] {
    const allowed = this.roomAllowedAIs.get(roomId);
    if (!allowed || allowed.size === 0) return aiIds;
    return aiIds.filter((aiId) => allowed.has(aiId));
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

    if (!this.backgroundConversationTimer) {
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
    const scheduleNextMessage = () => {
      if (this.messageTracker.isAsleep || this.activeAIs.length === 0) {
        this.backgroundConversationTimer = setTimeout(
          scheduleNextMessage,
          TIMING.SLEEP_RETRY_INTERVAL,
        );
        return;
      }

      const delay =
        this.minBackgroundDelay +
        Math.random() * (this.maxBackgroundDelay - this.minBackgroundDelay);

      this.backgroundConversationTimer = setTimeout(() => {
        const timeSinceLastMessage = Date.now() - this.lastAIMessageTime;
        if (timeSinceLastMessage > TIMING.SILENCE_TIMEOUT) {
          scheduleNextMessage();
          return;
        }

        this.scheduleAIResponses("default", false);
        scheduleNextMessage();
      }, delay);
    };

    scheduleNextMessage();
  }

  cleanup() {
    if (this.backgroundConversationTimer) {
      clearTimeout(this.backgroundConversationTimer);
      this.backgroundConversationTimer = null;
    }
    this.messageBroker.removeAllListeners();
    this.removeAllListeners();
    this.aiServices.clear();
    this.activeAIs = [];
    this.contextManager.clear();
    this.messageBroker.clearQueue();
    this.responseQueue.clear();
  }
}

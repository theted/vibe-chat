/**
 * Chat Orchestrator - Manages multi-AI conversations
 */

import { EventEmitter } from "events";
import { AIServiceFactory } from "@/services/AIServiceFactory.js";
import { ContextManager } from "./ContextManager.js";
import { MessageBroker } from "./MessageBroker.js";
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

type QueuedResponse = {
  aiId: string;
  roomId: string;
  isUserResponse: boolean;
  options: GenerateResponseOptions;
  scheduledTime: number;
};

type GenerateResponseOptions = {
  isMentioned?: boolean;
  triggerMessage?: { id?: string; sender?: string };
};

const MAX_PARALLEL_AI_INITIALIZATIONS = 8;

/**
 * Run async tasks with a concurrency limit.
 */
const runWithConcurrencyLimit = async (
  tasks: Array<() => Promise<void>>,
  limit: number,
): Promise<void> => {
  if (tasks.length === 0) {
    return;
  }

  const concurrency = Math.max(1, limit);
  let nextIndex = 0;
  const workerCount = Math.min(concurrency, tasks.length);

  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      const task = tasks[currentIndex];
      if (!task) {
        return;
      }
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
  // Response queue for concurrency limiting
  maxConcurrentResponses: number;
  responseQueue: QueuedResponse[];
  activeResponseCount: number;
  isProcessingQueue: boolean;
  private roomAllowedAIs: Map<string, Set<string>>;

  /**
   * Create a ChatOrchestrator instance.
   * @param options - Overrides for limits, delays, and logging flags.
   */
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
    // Fast responses to user messages
    this.minUserResponseDelay =
      options.minUserResponseDelay || DEFAULTS.MIN_USER_RESPONSE_DELAY;
    this.maxUserResponseDelay =
      options.maxUserResponseDelay || DEFAULTS.MAX_USER_RESPONSE_DELAY;
    // Background AI conversation timing
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

    // Response queue initialization
    this.maxConcurrentResponses =
      options.maxConcurrentResponses || DEFAULTS.MAX_CONCURRENT_RESPONSES;
    this.responseQueue = [];
    this.activeResponseCount = 0;
    this.isProcessingQueue = false;
    this.roomAllowedAIs = new Map();

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

  /**
   * Setup message broker event handlers
   */
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

  /**
   * Initialize AI services for the chat
   * @param {Array} aiConfigs - Array of AI configuration objects
   */
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

  /**
   * Process incoming message
   * @param {Object} message - Incoming message
   */
  async handleMessage(message) {
    // Add to context
    this.contextManager.addMessage(message);

    if (message.senderType === "user") {
      await this.handleUserMessage(message);
    } else {
      await this.handleAIMessage(message);
    }

    // Broadcast the message
    this.messageBroker.broadcastMessage(message, message.roomId);
  }

  /**
   * Handle user message
   * @param {Object} message - User message
   */
  async handleUserMessage(message) {
    // Reset AI message tracker - users wake up AIs
    this.wakeUpAIs();

    if (message?.suppressAIResponses) {
      console.info(
        "[ChatAssistant] Suppressing AI responses for this message (handled by @Chat).",
      );
      return;
    }

    // Schedule AI responses with random delays
    this.scheduleAIResponses(message.roomId);
  }

  /**
   * Handle AI message
   * @param {Object} message - AI message
   */
  async handleAIMessage(message) {
    this.messageTracker.aiMessageCount++;
    this.lastAIMessageTime = Date.now();

    if (
      this.messageTracker.aiMessageCount >= this.messageTracker.maxAIMessages
    ) {
      this.putAIsToSleep();
    }
  }

  /**
   * Schedule AI responses
   * @param {string} roomId - Room ID
   * @param {boolean} isUserResponse - Whether this is a response to user message
   */
  scheduleAIResponses(roomId, isUserResponse = true) {
    const roomScopedAIs = this.filterAIsForRoom(roomId, this.activeAIs);

    if (this.messageTracker.isAsleep || roomScopedAIs.length === 0) {
      return;
    }

    // Count how many AIs are currently typing/generating
    const typingAICount = roomScopedAIs.filter((aiId) => {
      const ai = this.aiServices.get(aiId);
      return ai && ai.isGenerating;
    }).length;

    const eligibleAIs = roomScopedAIs.filter((aiId) => {
      const ai = this.aiServices.get(aiId);
      return (
        ai &&
        ai.isActive &&
        !ai.isGenerating &&
        (isUserResponse || !ai.justResponded)
      );
    });

    if (eligibleAIs.length === 0) return;

    const activeCount = eligibleAIs.length;
    const baseMaxResponders = isUserResponse
      ? Math.max(
          RESPONDER_CONFIG.USER_RESPONSE_MIN_COUNT,
          Math.ceil(
            activeCount * RESPONDER_CONFIG.USER_RESPONSE_MAX_MULTIPLIER,
          ),
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

    const finalMin = Math.max(
      baseMinResponders,
      uniqueMentioned.length || baseMinResponders,
    );
    const finalMax = Math.max(baseMaxResponders, finalMin);

    const availableForRandom = eligibleAIs.filter(
      (aiId) => !uniqueMentioned.includes(aiId),
    );

    const minAdditional = Math.max(finalMin - uniqueMentioned.length, 0);
    const maxAdditional = Math.max(finalMax - uniqueMentioned.length, 0);

    const additionalResponders =
      maxAdditional > 0
        ? this.selectRespondingAIs(
            minAdditional,
            maxAdditional,
            availableForRandom,
          )
        : [];

    const responders = [...uniqueMentioned, ...additionalResponders];

    // Queue responses instead of firing all at once
    responders.forEach((aiId, index) => {
      const isMentioned = uniqueMentioned.includes(aiId);
      const delay = this.calculateResponseDelay(
        index,
        isUserResponse,
        isMentioned,
        typingAICount,
      );

      const queuedResponse: QueuedResponse = {
        aiId,
        roomId,
        isUserResponse,
        options: {
          isMentioned,
          triggerMessage: lastMessage,
        },
        scheduledTime: Date.now() + delay,
      };

      this.responseQueue.push(queuedResponse);
    });

    // Sort queue by scheduled time
    this.responseQueue.sort((a, b) => a.scheduledTime - b.scheduledTime);

    // Start processing the queue
    this.processResponseQueue();
  }

  /**
   * Process queued responses respecting concurrency limit
   */
  processResponseQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    const processNext = () => {
      // Check if we can process more responses
      if (
        this.responseQueue.length === 0 ||
        this.activeResponseCount >= this.maxConcurrentResponses
      ) {
        this.isProcessingQueue = false;
        return;
      }

      const now = Date.now();
      const nextResponse = this.responseQueue[0];

      // Wait until scheduled time
      const waitTime = Math.max(0, nextResponse.scheduledTime - now);

      setTimeout(() => {
        // Re-check conditions after wait
        if (
          this.messageTracker.isAsleep ||
          this.activeResponseCount >= this.maxConcurrentResponses
        ) {
          this.isProcessingQueue = false;
          // Retry later if we're at capacity
          if (this.responseQueue.length > 0) {
            setTimeout(() => this.processResponseQueue(), TIMING.QUEUE_RETRY_INTERVAL);
          }
          return;
        }

        // Remove from queue and process
        const response = this.responseQueue.shift();
        if (response) {
          this.activeResponseCount++;
          this.generateAIResponse(
            response.aiId,
            response.roomId,
            response.isUserResponse,
            response.options
          );
        }

        // Continue processing
        processNext();
      }, waitTime);
    };

    processNext();
  }

  /**
   * Generate AI response
   * @param {string} aiId - AI service ID
   * @param {string} roomId - Room ID
   * @param {boolean} isUserResponse - Whether this is a response to user message
   */
  async generateAIResponse(
    aiId,
    roomId,
    isUserResponse = true,
    options: GenerateResponseOptions = {},
  ) {
    if (this.messageTracker.isAsleep) {
      return;
    }

    const aiService = this.aiServices.get(aiId);
    if (!aiService || !aiService.isActive) {
      return;
    }

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

      let context = this.contextManager.getContextForAI(
        CONTEXT_LIMITS.AI_CONTEXT_SIZE,
      );
      let responseType = "response";
      let systemPrompt = this.createEnhancedSystemPrompt(
        aiService,
        context,
        isUserResponse,
      );

      // Determine AI interaction strategy based on context
      const interactionStrategy = this.determineInteractionStrategy(
        aiService,
        context,
        isUserResponse,
      );
      responseType = interactionStrategy.type;

      // Apply interaction strategy to context
      context = this.applyInteractionStrategy(
        context,
        interactionStrategy,
        aiService,
      );

      // Add the enhanced system prompt
      const systemMessage: ContextMessage = {
        role: "system",
        content: systemPrompt,
        senderType: "system",
        isInternal: true,
      };
      const messagesWithSystem = [systemMessage, ...context];

      this.logAIContext(aiService, messagesWithSystem);

      const response =
        await aiService.service.generateResponse(messagesWithSystem);
      const responseTimeMs = Date.now() - responseStartTime;
      let processedResponse = this.truncateResponse(response);
      aiService.lastMessageTime = Date.now();

      // Add @mentions if strategy calls for it
      if (interactionStrategy.shouldMention && interactionStrategy.targetAI) {
        processedResponse = this.addMentionToResponse(
          processedResponse,
          interactionStrategy.targetAI,
        );
      }

      processedResponse = limitMentionsInResponse(processedResponse);

      console.log(
        `✨ ${aiService.name} ${responseType}: ${processedResponse.substring(
          0,
          100,
        )}${processedResponse.length > 100 ? "..." : ""}`,
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
        responseType,
        interactionStrategy: interactionStrategy.type,
        priority: isUserResponse ? 500 : 0,
      };

      // Queue the AI response
      this.messageBroker.enqueueMessage(aiMessage as any);
      this.emit("ai-response", {
        ...aiMeta,
        responseTimeMs,
      });
    } catch (error) {
      const responseTimeMs = Date.now() - responseStartTime;
      console.error(
        `❌ AI ${aiId} failed to generate response:`,
        error.message,
      );
      this.emit("ai-error", {
        ...aiMeta,
        aiId,
        error,
        responseTimeMs,
      });
    } finally {
      aiService.isGenerating = false;
      this.activeResponseCount = Math.max(0, this.activeResponseCount - 1);
      this.emit("ai-generating-stop", aiMeta);

      // Process next queued response now that we have capacity
      if (this.responseQueue.length > 0) {
        this.processResponseQueue();
      }
    }
  }

  logAIContext(aiService, messages) {
    logAIContext(aiService, messages, this.verboseContextLogging);
  }

  selectRespondingAIs(
    minResponders = 1,
    maxResponders = 3,
    candidateList = null,
  ) {
    return selectRespondingAIs(
      this.aiServices,
      this.activeAIs,
      minResponders,
      maxResponders,
      candidateList,
    );
  }

  /**
   * Restrict AI responses for a room to the provided AI IDs.
   * @param {string} roomId - Room identifier.
   * @param {string[]} aiIds - Allowed AI IDs for the room.
   */
  setRoomAllowedAIs(roomId, aiIds) {
    if (!roomId) {
      return;
    }

    const uniqueIds = Array.from(
      new Set(aiIds.filter((aiId) => Boolean(aiId))),
    );

    if (uniqueIds.length === 0) {
      this.roomAllowedAIs.delete(roomId);
      return;
    }

    this.roomAllowedAIs.set(roomId, new Set(uniqueIds));
  }

  /**
   * Clear any AI restrictions for a room.
   * @param {string} roomId - Room identifier.
   */
  clearRoomAllowedAIs(roomId) {
    this.roomAllowedAIs.delete(roomId);
  }

  filterAIsForRoom(roomId, aiIds) {
    const allowed = this.roomAllowedAIs.get(roomId);
    if (!allowed || allowed.size === 0) {
      return aiIds;
    }
    return aiIds.filter((aiId) => allowed.has(aiId));
  }

  findAIByNormalizedAlias(normalizedAlias) {
    return findAIByNormalizedAlias(this.aiServices, normalizedAlias);
  }

  findAIFromContextMessage(message) {
    return findAIFromContextMessage(this.aiServices, message);
  }

  getMentionTokenForAI(ai) {
    return getMentionTokenForAI(ai);
  }

  getAIDisplayName(ai) {
    return getAIDisplayName(ai);
  }

  calculateResponseDelay(
    index,
    isUserResponse = true,
    isMentioned = false,
    typingAICount = 0,
  ) {
    return calculateResponseDelay({
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
  }

  truncateResponse(response) {
    return truncateResponse(response);
  }

  enhanceContextForTopicChange(context) {
    return enhanceContextForTopicChange(context);
  }

  enhanceContextForComment(context, lastMessage) {
    return enhanceContextForComment(context, lastMessage);
  }

  createEnhancedSystemPrompt(aiService, context, isUserResponse) {
    return createEnhancedSystemPrompt(
      aiService,
      context,
      isUserResponse,
      this.aiServices,
    );
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

  applyInteractionStrategy(context, strategy, aiService) {
    return applyInteractionStrategy(
      context,
      strategy,
      aiService,
      context[context.length - 1],
    );
  }

  addMentionToResponse(response, targetAI) {
    return addMentionToResponse(this.aiServices, response, targetAI);
  }

  limitMentionsInResponse(response) {
    return limitMentionsInResponse(response);
  }

  /**
   * Wake up AIs (reset message counter)
   */
  wakeUpAIs() {
    this.messageTracker.aiMessageCount = 0;
    this.messageTracker.isAsleep = false;
    this.emit("ais-awakened");

    // Restart background conversation if it was stopped
    if (!this.backgroundConversationTimer) {
      this.startBackgroundConversation();
    }
  }

  /**
   * Put AIs to sleep
   */
  putAIsToSleep() {
    this.messageTracker.isAsleep = true;
    this.emit("ais-sleeping", { reason: "message-limit-reached" });
  }

  /**
   * Add message to chat
   * @param {Object} message - Message to add
   */
  addMessage(message) {
    this.messageBroker.enqueueMessage(message as any);
  }

  /**
   * Change topic
   * @param {string} newTopic - New topic
   * @param {string} changedBy - Who changed the topic
   * @param {string} roomId - Room ID
   */
  changeTopic(newTopic, changedBy, roomId) {
    const topicMessage = {
      sender: "System",
      content: `Topic changed to: "${newTopic}" by ${changedBy}`,
      senderType: "system",
      roomId,
      priority: 1000, // High priority for system messages
    };

    this.addMessage(topicMessage);
    this.emit("topic-changed", { newTopic, changedBy, roomId });
  }

  /**
   * Get orchestrator status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      aiServices: this.aiServices.size,
      activeAIs: this.activeAIs.length,
      messageTracker: { ...this.messageTracker },
      contextSize: this.contextManager.size(),
      queueStatus: this.messageBroker.getQueueStatus(),
    };
  }

  /**
   * Start background conversation between AIs
   */
  startBackgroundConversation() {
    const scheduleNextMessage = () => {
      if (this.messageTracker.isAsleep || this.activeAIs.length === 0) {
        // Retry after interval if AIs are asleep
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
        // Only generate background messages if there has been recent activity
        const timeSinceLastMessage = Date.now() - this.lastAIMessageTime;
        if (timeSinceLastMessage > TIMING.SILENCE_TIMEOUT) {
          scheduleNextMessage();
          return;
        }

        // Generate background AI message
        this.scheduleAIResponses("default", false); // false = background message
        scheduleNextMessage();
      }, delay);
    };

    scheduleNextMessage();
  }

  /**
   * Cleanup resources
   */
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
    this.responseQueue = [];
    this.activeResponseCount = 0;
  }
}

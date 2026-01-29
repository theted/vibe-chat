/**
 * Chat Orchestrator - Manages multi-AI conversations
 */

import { EventEmitter } from "events";
import { AIServiceFactory } from "../services/AIServiceFactory.js";
import { ContextManager } from "./ContextManager.js";
import { MessageBroker } from "./MessageBroker.js";
import {
  DEFAULTS,
  CONTEXT_LIMITS,
  TIMING,
  STRATEGY_WEIGHTS,
  STRATEGY_ADJUSTMENTS,
  MENTION_CONFIG,
  RESPONDER_CONFIG,
  DELAY_CALC,
  SYSTEM_PROMPT,
  STRATEGY_INSTRUCTIONS,
  MENTION_FORMATS,
} from "./constants.js";
import { AI_PROVIDERS } from "../config/aiProviders/index.js";
import {
  enhanceSystemPromptWithPersona,
  getPersonaFromProvider,
} from "../utils/personaUtils.js";
import {
  normalizeAlias,
  toMentionAlias,
  parseBooleanEnvFlag,
  getEnvFlag,
} from "../utils/stringUtils.js";

type ChatOrchestratorOptions = {
  maxMessages?: number;
  maxAIMessages?: number;
  minUserResponseDelay?: number;
  maxUserResponseDelay?: number;
  minBackgroundDelay?: number;
  maxBackgroundDelay?: number;
  minDelayBetweenAI?: number;
  maxDelayBetweenAI?: number;
  topicChangeChance?: number;
  verboseContextLogging?: boolean;
};

type GenerateResponseOptions = {
  isMentioned?: boolean;
  triggerMessage?: { id?: string; sender?: string };
};

type StrategyOption = {
  type: string;
  weight: number;
};

/**
 * Orchestrates multi-AI conversations and background scheduling.
 */
export class ChatOrchestrator extends EventEmitter {
  contextManager: ContextManager;
  messageBroker: MessageBroker;
  aiServices: Map<string, any>;
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

  /**
   * Create a ChatOrchestrator instance.
   * @param options - Overrides for limits, delays, and logging flags.
   */
  constructor(options: ChatOrchestratorOptions = {}) {
    super();
    this.contextManager = new ContextManager(
      options.maxMessages || DEFAULTS.MAX_MESSAGES
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

    const envVerboseFlag = parseBooleanEnvFlag(
      getEnvFlag("AI_CHAT_VERBOSE_CONTEXT")
    );
    this.verboseContextLogging =
      typeof options.verboseContextLogging === "boolean"
        ? options.verboseContextLogging
        : envVerboseFlag;

    this.setupMessageBroker();
    this.startBackgroundConversation();
  }

  logAIContext(aiService, messages) {
    if (!this.verboseContextLogging || !Array.isArray(messages)) {
      return;
    }

    const provider = aiService.config?.providerKey || "unknown";
    const model =
      aiService.config?.modelKey || aiService.service?.getModel?.() || "unknown";
    console.log(
      `📝 [Verbose] Prompt for ${aiService.name} (${provider}:${model})`
    );

    messages.forEach((message, index) => {
      const parts = [];
      if (message.role) parts.push(message.role);
      if (message.sender) parts.push(message.sender);
      const label = parts.length ? parts.join(" · ") : `message-${index + 1}`;
      const contentValue =
        typeof message.content === "string"
          ? message.content
          : JSON.stringify(message.content, null, 2);
      const lines = contentValue ? contentValue.split("\n") : ["<empty>"];
      console.log(`   ${index + 1}. ${label}`);
      lines.forEach((line) => {
        if (line.length === 0) {
          console.log("      ");
        } else {
          console.log(`      ${line}`);
        }
      });
    });

    console.log("📝 [Verbose] End prompt\n");
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
    for (const config of aiConfigs) {
      try {
        const service = AIServiceFactory.createServiceByName(
          config.providerKey,
          config.modelKey
        );
        await service.initialize();

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
          error
        );
        failedConfigs.push({
          providerKey: config.providerKey,
          modelKey: config.modelKey,
          displayName: config.displayName,
          alias: config.alias,
        });
      }
    }

    console.log(`Initialized ${this.aiServices.size} AI services`);

    if (failedConfigs.length > 0) {
      console.warn(
        `⚠️  ${failedConfigs.length} AI model(s) failed to initialize:`
      );
      failedConfigs.forEach((failed) => {
        const label =
          failed.displayName ||
          failed.alias ||
          `${failed.providerKey}_${failed.modelKey}`;
        console.warn(`   • ${label} (${failed.providerKey}_${failed.modelKey})`);
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
        "[ChatAssistant] Suppressing AI responses for this message (handled by @Chat)."
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
    if (this.messageTracker.isAsleep || this.activeAIs.length === 0) {
      return;
    }

    // Count how many AIs are currently typing/generating
    const typingAICount = this.activeAIs.filter((aiId) => {
      const ai = this.aiServices.get(aiId);
      return ai && ai.isGenerating;
    }).length;

    const eligibleAIs = this.activeAIs.filter((aiId) => {
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
          Math.ceil(activeCount * RESPONDER_CONFIG.USER_RESPONSE_MAX_MULTIPLIER)
        )
      : Math.max(
          RESPONDER_CONFIG.BACKGROUND_MIN_COUNT,
          Math.ceil(activeCount * RESPONDER_CONFIG.BACKGROUND_MAX_MULTIPLIER)
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
      uniqueMentioned.length || baseMinResponders
    );
    const finalMax = Math.max(baseMaxResponders, finalMin);

    const availableForRandom = eligibleAIs.filter(
      (aiId) => !uniqueMentioned.includes(aiId)
    );

    const minAdditional = Math.max(finalMin - uniqueMentioned.length, 0);
    const maxAdditional = Math.max(finalMax - uniqueMentioned.length, 0);

    const additionalResponders =
      maxAdditional > 0
        ? this.selectRespondingAIs(
            minAdditional,
            maxAdditional,
            availableForRandom
          )
        : [];

    const responders = [...uniqueMentioned, ...additionalResponders];

    responders.forEach((aiId, index) => {
      const isMentioned = uniqueMentioned.includes(aiId);
      const delay = this.calculateResponseDelay(
        index,
        isUserResponse,
        isMentioned,
        typingAICount
      );

      setTimeout(() => {
        this.generateAIResponse(aiId, roomId, isUserResponse, {
          isMentioned,
          triggerMessage: lastMessage,
        });
      }, delay);
    });
  }

  /**
   * Select which AIs should respond
   * @param {number} minResponders - Minimum number of responders
   * @param {number} maxResponders - Maximum number of responders
   * @returns {Array} Array of AI IDs that should respond
   */
  selectRespondingAIs(
    minResponders = 1,
    maxResponders = 3,
    candidateList = null
  ) {
    const pool = candidateList || this.activeAIs;
    const availableAIs = pool.filter((aiId) => {
      const ai = this.aiServices.get(aiId);
      return ai && ai.isActive;
    });

    // Randomly select between min and max AIs
    const numResponders = Math.min(
      Math.floor(Math.random() * (maxResponders - minResponders + 1)) +
        minResponders,
      availableAIs.length
    );
    const shuffled = [...availableAIs].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, numResponders);
  }

  findAIByNormalizedAlias(normalizedAlias) {
    if (!normalizedAlias) return null;
    for (const ai of this.aiServices.values()) {
      if (!ai) continue;
      if (ai.normalizedAlias === normalizedAlias) return ai;
      if (normalizeAlias(ai.displayName) === normalizedAlias) return ai;
      if (normalizeAlias(ai.name) === normalizedAlias) return ai;
      if (normalizeAlias(ai.config?.modelKey) === normalizedAlias) return ai;
    }
    return null;
  }

  findAIFromContextMessage(message) {
    if (!message) return null;

    if (message.aiId && this.aiServices.has(message.aiId)) {
      return this.aiServices.get(message.aiId);
    }

    const candidates = [
      message.alias,
      message.normalizedAlias,
      message.displayName,
      message.sender,
    ].filter(Boolean);

    for (const candidate of candidates) {
      const ai = this.findAIByNormalizedAlias(normalizeAlias(candidate));
      if (ai) return ai;
    }

    return null;
  }

  getMentionTokenForAI(ai) {
    if (!ai) return null;
    if (ai.alias) return ai.alias;
    if (ai.displayName) return toMentionAlias(ai.displayName);
    return toMentionAlias(ai.name || ai.id || "");
  }

  getAIDisplayName(ai) {
    if (!ai) return "";
    const candidates = [
      ai.displayName,
      ai.config?.displayName,
      ai.displayAlias,
      ai.config?.alias,
      ai.config?.modelKey,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === "string") {
        const trimmed = candidate.trim();
        if (trimmed) return trimmed;
      }
    }

    if (typeof ai.service?.getModel === "function") {
      const model = ai.service.getModel();
      if (model) return model;
    }

    return ai.name || ai.id || "";
  }

  /**
   * Calculate response delay for AI
   * @param {number} index - AI response index
   * @param {boolean} isUserResponse - Whether this is a response to user message
   * @param {boolean} isMentioned - Whether this AI was mentioned
   * @param {number} typingAICount - Number of AIs currently typing/generating
   * @returns {number} Delay in milliseconds
   */
  calculateResponseDelay(index, isUserResponse = true, isMentioned = false, typingAICount = 0) {
    // First responder to user messages gets minimal delay for snappy UX
    if (index === 0 && isUserResponse) {
      const firstResponderDelay =
        DEFAULTS.MIN_FIRST_RESPONDER_DELAY +
        Math.random() * (DEFAULTS.MAX_FIRST_RESPONDER_DELAY - DEFAULTS.MIN_FIRST_RESPONDER_DELAY);
      return Math.floor(firstResponderDelay);
    }

    let baseDelay;

    if (isUserResponse) {
      // Fast responses to user messages (1-10 seconds)
      baseDelay =
        this.minUserResponseDelay +
        Math.random() * (this.maxUserResponseDelay - this.minUserResponseDelay);
    } else {
      // Background conversation timing (10-30 seconds)
      baseDelay =
        this.minBackgroundDelay +
        Math.random() * (this.maxBackgroundDelay - this.minBackgroundDelay);
    }

    if (isMentioned) {
      baseDelay = Math.max(
        TIMING.MIN_MENTIONED_DELAY,
        baseDelay * TIMING.MENTIONED_DELAY_MULTIPLIER
      );
    }

    const randomness = Math.random();
    const staggerDelay =
      index * this.minDelayBetweenAI +
      randomness * (this.maxDelayBetweenAI - this.minDelayBetweenAI);

    const catchUpDelay =
      Math.pow(randomness, DELAY_CALC.CATCH_UP_POWER) *
      DELAY_CALC.CATCH_UP_MULTIPLIER;

    // Add typing awareness - increase delay if other AIs are typing
    let typingAwarenessDelay = 0;
    if (typingAICount > 0) {
      // Add base delay per typing AI with randomness
      typingAwarenessDelay = typingAICount * TIMING.TYPING_AWARENESS_DELAY * (0.8 + Math.random() * 0.4);

      // Apply multiplier to base delay (but not to mentioned AIs - they should still respond relatively quickly)
      if (!isMentioned) {
        const multiplier = Math.min(
          1 + (typingAICount * 0.5),
          TIMING.TYPING_AWARENESS_MAX_MULTIPLIER
        );
        baseDelay *= multiplier;
      }
    }

    return Math.floor(baseDelay + staggerDelay + catchUpDelay + typingAwarenessDelay);
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
    options: GenerateResponseOptions = {}
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
        }...`
      );

      let context = this.contextManager.getContextForAI(
        CONTEXT_LIMITS.AI_CONTEXT_SIZE
      );
      let responseType = "response";
      let systemPrompt = this.createEnhancedSystemPrompt(
        aiService,
        context,
        isUserResponse
      );

      // Determine AI interaction strategy based on context
      const interactionStrategy = this.determineInteractionStrategy(
        aiService,
        context,
        isUserResponse
      );
      responseType = interactionStrategy.type;

      // Apply interaction strategy to context
      context = this.applyInteractionStrategy(
        context,
        interactionStrategy,
        aiService
      );

      // Add the enhanced system prompt
      const messagesWithSystem = [
        {
          role: "system",
          content: systemPrompt,
          senderType: "system",
          isInternal: true,
        },
        ...context,
      ];

      this.logAIContext(aiService, messagesWithSystem);

      const response = await aiService.service.generateResponse(
        messagesWithSystem
      );
      const responseTimeMs = Date.now() - responseStartTime;
      let processedResponse = this.truncateResponse(response);
      aiService.lastMessageTime = Date.now();

      // Add @mentions if strategy calls for it
      if (interactionStrategy.shouldMention && interactionStrategy.targetAI) {
        processedResponse = this.addMentionToResponse(
          processedResponse,
          interactionStrategy.targetAI
        );
      }

      console.log(
        `✨ ${aiService.name} ${responseType}: ${processedResponse.substring(
          0,
          100
        )}${processedResponse.length > 100 ? "..." : ""}`
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
        error.message
      );
      this.emit("ai-error", {
        ...aiMeta,
        aiId,
        error,
        responseTimeMs,
      });
    } finally {
      aiService.isGenerating = false;
      this.emit("ai-generating-stop", aiMeta);
    }
  }

  /**
   * Truncate AI response to keep it concise (2-3 sentences max)
   * @param {string} response - Original AI response
   * @returns {string} Truncated response
   */
  truncateResponse(response) {
    // Handle response object with content property
    if (response && typeof response === "object" && "content" in response) {
      response = response.content;
    }

    if (!response || typeof response !== "string") {
      return response;
    }

    // Split into sentences (looking for periods, exclamation marks, question marks)
    const sentences = response
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim().length > 0);

    if (sentences.length <= CONTEXT_LIMITS.MAX_SENTENCES) {
      return response.trim();
    }

    // Truncate to max sentences
    let truncated = sentences
      .slice(0, CONTEXT_LIMITS.MAX_SENTENCES)
      .join(" ")
      .trim();

    // Ensure it ends with proper punctuation
    if (!truncated.match(/[.!?]$/)) {
      truncated += ".";
    }

    return truncated;
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
          TIMING.SLEEP_RETRY_INTERVAL
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
   * Enhance context for topic change
   * @param {Array} context - Original context
   * @returns {Array} Enhanced context
   */
  enhanceContextForTopicChange(context) {
    const enhancedContext = [...context];
    enhancedContext.push({
      sender: "System",
      content:
        "Feel free to introduce a new interesting topic or shift the conversation in a different direction.",
      senderType: "system",
      role: "system",
      isInternal: true,
    });
    return enhancedContext;
  }

  /**
   * Create enhanced system prompt for AI interactions
   * @param {Object} aiService - AI service object
   * @param {Array} context - Message context
   * @param {boolean} isUserResponse - Whether responding to user
   * @returns {string} Enhanced system prompt
   */
  createEnhancedSystemPrompt(aiService, context, isUserResponse) {
    let prompt = `You are ${aiService.name}, an AI participating in a dynamic group chat. `;

    // Add context-specific intro
    if (isUserResponse) {
      prompt += `${SYSTEM_PROMPT.INTRO_USER_RESPONSE} `;
    } else {
      prompt += `${SYSTEM_PROMPT.INTRO_BACKGROUND} `;
    }

    // Add guidelines
    prompt += SYSTEM_PROMPT.GUIDELINES;

    const otherAINames = Array.from(this.aiServices.values())
      .filter((ai) => ai !== aiService)
      .map((ai) => this.getAIDisplayName(ai))
      .filter(Boolean);

    // Add other participants
    prompt += `

Other AIs in this chat: ${otherAINames.join(", ")}

${SYSTEM_PROMPT.CLOSING}`;

    const personasEnabled = parseBooleanEnvFlag(
      getEnvFlag("AI_CHAT_ENABLE_PERSONAS")
    );
    const providerKey = aiService?.config?.providerKey;
    const fallbackProvider = providerKey
      ? AI_PROVIDERS[providerKey as keyof typeof AI_PROVIDERS]
      : undefined;
    const personaProvider =
      aiService?.service?.config?.provider ||
      aiService?.config?.provider ||
      fallbackProvider;
    const persona = personasEnabled
      ? getPersonaFromProvider(personaProvider)
      : null;

    if (persona) {
      prompt = enhanceSystemPromptWithPersona(prompt, persona);
    }

    return prompt;
  }

  /**
   * Determine interaction strategy for AI response
   * @param {Object} aiService - AI service object
   * @param {Array} context - Message context
   * @param {boolean} isUserResponse - Whether responding to user
   * @returns {Object} Interaction strategy
   */
  determineInteractionStrategy(aiService, context, isUserResponse) {
    const recentMessages = context.slice(
      -CONTEXT_LIMITS.RECENT_MESSAGES_FOR_STRATEGY
    );
    const aiMessages = recentMessages.filter((msg) => msg.senderType === "ai");
    const lastMessage = recentMessages[recentMessages.length - 1];

    const strategies: Record<string, StrategyOption> = {
      AGREE_AND_EXPAND: {
        type: "agree-expand",
        weight: STRATEGY_WEIGHTS.AGREE_AND_EXPAND,
      },
      CHALLENGE_AND_DEBATE: {
        type: "challenge",
        weight: STRATEGY_WEIGHTS.CHALLENGE_AND_DEBATE,
      },
      REDIRECT_TOPIC: {
        type: "redirect",
        weight: STRATEGY_WEIGHTS.REDIRECT_TOPIC,
      },
      ASK_QUESTION: { type: "question", weight: STRATEGY_WEIGHTS.ASK_QUESTION },
      DIRECT_RESPONSE: {
        type: "direct",
        weight: STRATEGY_WEIGHTS.DIRECT_RESPONSE,
      },
    };

    // Adjust weights based on context
    if (lastMessage?.senderType === "ai" && !isUserResponse) {
      strategies.CHALLENGE_AND_DEBATE.weight +=
        STRATEGY_ADJUSTMENTS.AI_MESSAGE_BACKGROUND_CHALLENGE;
      strategies.AGREE_AND_EXPAND.weight +=
        STRATEGY_ADJUSTMENTS.AI_MESSAGE_BACKGROUND_AGREE;
    }

    if (aiMessages.length >= STRATEGY_ADJUSTMENTS.MANY_AI_MESSAGES_THRESHOLD) {
      strategies.REDIRECT_TOPIC.weight +=
        STRATEGY_ADJUSTMENTS.MANY_AI_MESSAGES_REDIRECT;
      strategies.ASK_QUESTION.weight +=
        STRATEGY_ADJUSTMENTS.MANY_AI_MESSAGES_QUESTION;
    }

    const selfNormalized =
      aiService.normalizedAlias ||
      normalizeAlias(
        aiService.alias || aiService.displayName || aiService.name
      );
    const mentionTargets = new Set(lastMessage?.mentionsNormalized || []);
    const mentionsCurrentAI = mentionTargets.has(selfNormalized);

    // Select strategy based on weighted random
    let selectedStrategy = strategies.DIRECT_RESPONSE;
    if (mentionsCurrentAI) {
      selectedStrategy = strategies.DIRECT_RESPONSE;
    } else {
      const randomValue = Math.random();
      let cumulativeWeight = 0;
      for (const strategy of Object.values(strategies)) {
        cumulativeWeight += strategy.weight;
        if (randomValue <= cumulativeWeight) {
          selectedStrategy = strategy;
          break;
        }
      }
    }

    let shouldMention = false;
    let targetAI = null;

    const mentionCandidateRaw =
      lastMessage?.alias ||
      lastMessage?.displayName ||
      lastMessage?.sender ||
      "";
    const mentionCandidate = mentionCandidateRaw.trim();
    const shouldMentionUser =
      isUserResponse &&
      lastMessage?.senderType === "user" &&
      mentionCandidate.length > 0;

    if (shouldMentionUser) {
      const cleanedAlias = mentionCandidate.startsWith("@")
        ? mentionCandidate.slice(1)
        : mentionCandidate;

      if (cleanedAlias.length > 0) {
        shouldMention = true;
        targetAI = {
          type: "user",
          alias: cleanedAlias,
          displayName: lastMessage.displayName || cleanedAlias,
        };
      }
    } else if (mentionsCurrentAI) {
      if (lastMessage?.senderType === "ai") {
        const sourceAI = this.findAIFromContextMessage(lastMessage);
        if (sourceAI && sourceAI.id !== aiService.id) {
          shouldMention = true;
          targetAI = this.getMentionTokenForAI(sourceAI);
        }
      }
    } else {
      const potentialTargets = [];

      if (lastMessage?.senderType === "ai") {
        const lastAI = this.findAIFromContextMessage(lastMessage);
        if (lastAI && lastAI.id !== aiService.id) {
          potentialTargets.push(lastAI);
        }
      }

      for (
        let i = aiMessages.length - 1;
        i >= 0 &&
        potentialTargets.length < CONTEXT_LIMITS.POTENTIAL_MENTION_TARGETS;
        i--
      ) {
        const msg = aiMessages[i];
        const targetAIInfo = this.findAIFromContextMessage(msg);
        if (
          targetAIInfo &&
          targetAIInfo.id !== aiService.id &&
          !potentialTargets.some((existing) => existing.id === targetAIInfo.id)
        ) {
          potentialTargets.push(targetAIInfo);
        }
      }

      if (potentialTargets.length > 0) {
        shouldMention =
          Math.random() < MENTION_CONFIG.RANDOM_MENTION_PROBABILITY;
        if (shouldMention) {
          const selected = potentialTargets[0];
          targetAI = this.getMentionTokenForAI(selected);
        }
      }
    }

    if (!targetAI) {
      shouldMention = false;
    }

    return {
      ...selectedStrategy,
      shouldMention,
      targetAI,
      mentionsCurrentAI,
    };
  }

  /**
   * Apply interaction strategy to context
   * @param {Array} context - Original context
   * @param {Object} strategy - Interaction strategy
   * @param {Object} aiService - AI service
   * @returns {Array} Enhanced context
   */
  applyInteractionStrategy(context, strategy, aiService) {
    const enhancedContext = [...context];
    const lastMessage = context[context.length - 1];

    let instructionPrompt = "";

    const aiNormalized =
      aiService.normalizedAlias ||
      normalizeAlias(
        aiService.alias || aiService.displayName || aiService.name
      );
    const mentionsCurrentAI =
      lastMessage?.mentionsNormalized?.includes(aiNormalized);
    const mentionerName = lastMessage?.displayName || lastMessage?.sender;
    const mentionerAlias = lastMessage?.alias || lastMessage?.normalizedAlias;
    const mentionerToken = mentionerAlias
      ? `@${mentionerAlias}`
      : mentionerName;

    if (mentionsCurrentAI) {
      if (lastMessage?.senderType === "ai" && mentionerToken) {
        instructionPrompt = STRATEGY_INSTRUCTIONS.MENTIONED_BY_AI(mentionerToken);
      } else {
        instructionPrompt = STRATEGY_INSTRUCTIONS.MENTIONED_BY_USER;
      }
    } else {
      switch (strategy.type) {
        case "agree-expand":
          if (lastMessage?.senderType === "ai") {
            instructionPrompt = STRATEGY_INSTRUCTIONS.AGREE_EXPAND(
              lastMessage.sender
            );
          }
          break;

        case "challenge":
          if (lastMessage?.senderType === "ai") {
            instructionPrompt = STRATEGY_INSTRUCTIONS.CHALLENGE(
              lastMessage.sender
            );
          }
          break;

        case "redirect":
          instructionPrompt = STRATEGY_INSTRUCTIONS.REDIRECT;
          break;

        case "question":
          instructionPrompt = STRATEGY_INSTRUCTIONS.QUESTION;
          break;

        case "direct":
          instructionPrompt = STRATEGY_INSTRUCTIONS.DIRECT;
          break;
      }
    }

    if (instructionPrompt) {
      enhancedContext.push({
        sender: "System",
        content: instructionPrompt,
        senderType: "system",
        role: "system",
        isInternal: true,
      });
    }

    return enhancedContext;
  }

  /**
   * Add @mention to response if needed
   * @param {string} response - Original response
   * @param {string} targetAI - AI to mention
   * @returns {string} Response with mention
   */
  addMentionToResponse(response, targetAI) {
    if (!targetAI) {
      return response;
    }

    let mentionHandle = "";

    if (typeof targetAI === "object") {
      const aliasSourceRaw =
        (targetAI.displayName && targetAI.displayName.toString()) ||
        (targetAI.alias && targetAI.alias.toString()) ||
        "";
      const aliasSource = aliasSourceRaw.trim();

      if (!aliasSource) {
        return response;
      }

      mentionHandle = aliasSource.startsWith("@")
        ? aliasSource
        : `@${aliasSource}`;
    } else {
      const normalizedTarget = normalizeAlias(targetAI);
      const targetService = this.findAIByNormalizedAlias(normalizedTarget);
      const mentionAlias =
        this.getMentionTokenForAI(targetService) || toMentionAlias(targetAI);

      if (!mentionAlias) {
        return response;
      }

      mentionHandle = mentionAlias.startsWith("@")
        ? mentionAlias
        : `@${mentionAlias}`;
    }

    if (!mentionHandle.trim()) {
      return response;
    }

    if (response.includes(mentionHandle)) {
      return response;
    }

    // Use mention format from constants
    const formatIndex = Math.floor(Math.random() * MENTION_FORMATS.length);
    const formatFn = MENTION_FORMATS[formatIndex];
    return formatFn(mentionHandle, response);
  }

  /**
   * Enhance context for commenting on previous message
   * @param {Array} context - Original context
   * @param {Object} lastMessage - Last message to comment on
   * @returns {Array} Enhanced context
   */
  enhanceContextForComment(context, lastMessage) {
    const enhancedContext = [...context];
    enhancedContext.push({
      sender: "System",
      content: `Consider commenting on or building upon ${lastMessage.sender}'s message: "${lastMessage.content}"`,
      senderType: "system",
      role: "system",
      isInternal: true,
    });
    return enhancedContext;
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
  }
}

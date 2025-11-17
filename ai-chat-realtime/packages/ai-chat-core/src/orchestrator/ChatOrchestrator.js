/**
 * Chat Orchestrator - Manages multi-AI conversations
 */

import { EventEmitter } from "events";
import { AIServiceFactory } from "../services/AIServiceFactory.js";
import { ContextManager } from "./ContextManager.js";
import { MessageBroker } from "./MessageBroker.js";

const normalizeAlias = (value) =>
  value
    ? value
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
    : "";

const toMentionAlias = (value, fallback = "") => {
  const base = value && value.trim() ? value : fallback;
  if (!base) return "";
  return base
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export class ChatOrchestrator extends EventEmitter {
  constructor(options = {}) {
    super();
    this.contextManager = new ContextManager(options.maxMessages || 100);
    this.messageBroker = new MessageBroker();
    this.aiServices = new Map();
    this.activeAIs = [];
    this.messageTracker = {
      aiMessageCount: 0,
      maxAIMessages: options.maxAIMessages || 10,
      isAsleep: false,
    };
    this.lastAIMessageTime = 0;
    // Fast responses to user messages (1-10 seconds)
    this.minUserResponseDelay = options.minUserResponseDelay || 1000; // 1 second
    this.maxUserResponseDelay = options.maxUserResponseDelay || 10000; // 10 seconds
    // Background AI conversation timing (10-30 seconds)
    this.minBackgroundDelay = options.minBackgroundDelay || 10000; // 10 seconds
    this.maxBackgroundDelay = options.maxBackgroundDelay || 30000; // 30 seconds
    this.minDelayBetweenAI = options.minDelayBetweenAI || 1200;
    this.maxDelayBetweenAI = options.maxDelayBetweenAI || 3200;

    this.backgroundConversationTimer = null;
    this.topicChangeChance = options.topicChangeChance || 0.1; // 10% chance

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
      }
    }

    console.log(`Initialized ${this.aiServices.size} AI services`);
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
      ? Math.max(2, Math.ceil(activeCount * 0.45))
      : Math.max(1, Math.ceil(activeCount * 0.25));
    const baseMinResponders = isUserResponse ? 1 : 0;

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
        isMentioned
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

  /**
   * Calculate response delay for AI
   * @param {number} index - AI response index
   * @param {boolean} isUserResponse - Whether this is a response to user message
   * @returns {number} Delay in milliseconds
   */
  calculateResponseDelay(index, isUserResponse = true, isMentioned = false) {
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
      baseDelay = Math.max(400, baseDelay * 0.35);
    }

    const randomness = Math.random();
    const staggerDelay =
      index * (this.minDelayBetweenAI || 1000) +
      randomness * (this.maxDelayBetweenAI || 3000);

    const catchUpDelay = Math.pow(randomness, 2) * 1500;

    return Math.floor(baseDelay + staggerDelay + catchUpDelay);
  }

  /**
   * Generate AI response
   * @param {string} aiId - AI service ID
   * @param {string} roomId - Room ID
   * @param {boolean} isUserResponse - Whether this is a response to user message
   */
  async generateAIResponse(aiId, roomId, isUserResponse = true, options = {}) {
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

    try {
      console.log(
        `🤖 ${aiService.name} is generating ${
          isUserResponse ? "user response" : "background message"
        }...`
      );

      let context = this.contextManager.getContextForAI(25); // Get more context for better AI interactions
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

      const response = await aiService.service.generateResponse(
        messagesWithSystem
      );
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
      this.messageBroker.enqueueMessage(aiMessage);
    } catch (error) {
      console.error(
        `❌ AI ${aiId} failed to generate response:`,
        error.message
      );
      this.emit("ai-error", { aiId, error });
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
    if (!response || typeof response !== "string") {
      return response;
    }

    // Split into sentences (looking for periods, exclamation marks, question marks)
    const sentences = response
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim().length > 0);

    // Keep max 15 sentences
    const maxSentences = 15;
    if (sentences.length <= maxSentences) {
      return response.trim();
    }

    // Take first 2-3 sentences and ensure they end properly
    let truncated = sentences.slice(0, maxSentences).join(" ").trim();

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
    this.messageBroker.enqueueMessage(message);
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
        // Retry in 30 seconds if AIs are asleep
        this.backgroundConversationTimer = setTimeout(
          scheduleNextMessage,
          30000
        );
        return;
      }

      const delay =
        this.minBackgroundDelay +
        Math.random() * (this.maxBackgroundDelay - this.minBackgroundDelay);

      this.backgroundConversationTimer = setTimeout(() => {
        // Only generate background messages if there has been recent activity
        const timeSinceLastMessage = Date.now() - this.lastAIMessageTime;
        if (timeSinceLastMessage > 120000) {
          // 2 minutes of silence
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
    const recentMessages = context.slice(-5); // Focus on last 5 messages
    const aiNames = Array.from(this.aiServices.values()).map((ai) =>
      ai.name.toLowerCase()
    );

    let prompt = `You are ${aiService.name}, an AI participating in a dynamic group chat. `;

    if (isUserResponse) {
      prompt += `A user just posted. Respond naturally and conversationally. `;
    } else {
      prompt += `Continue the ongoing conversation between AIs. `;
    }

    prompt += `

Key guidelines:
• Keep responses 1-3 sentences and conversational
• Reference recent messages and build on ideas
• Use @mentions naturally when addressing someone - weave them into your response organically:
  - Start with mention: "@Claude, that's an interesting take on..."
  - End with question: "...what do you think, @Gemini?"
  - Build on their point: "@GPT, building on what you said..."
  - Seek input: "...curious for @Claude's perspective here"
• When you need implementation details or source code facts, mention @Chat with a clear question and wait for its answer before replying
• Feel free to challenge, expand on, or redirect the conversation
• Show personality and distinct perspectives
• The latest messages are most important for context
• Don't repeat what others just said - add new value
• Ask questions to spark further discussion
• Vary how you incorporate @mentions - sometimes front, sometimes back, sometimes middle

Other AIs in this chat: ${aiNames
      .filter((name) => name.toLowerCase() !== aiService.name.toLowerCase())
      .join(", ")}

Respond naturally and keep the conversation flowing!`;

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
    const recentMessages = context.slice(-8); // Look at last 8 messages
    const aiMessages = recentMessages.filter((msg) => msg.senderType === "ai");
    const lastMessage = recentMessages[recentMessages.length - 1];

    const strategies = {
      AGREE_AND_EXPAND: { type: "agree-expand", weight: 0.3 },
      CHALLENGE_AND_DEBATE: { type: "challenge", weight: 0.25 },
      REDIRECT_TOPIC: { type: "redirect", weight: 0.15 },
      ASK_QUESTION: { type: "question", weight: 0.2 },
      DIRECT_RESPONSE: { type: "direct", weight: 0.1 },
    };

    // Adjust weights based on context
    if (lastMessage?.senderType === "ai" && !isUserResponse) {
      strategies.CHALLENGE_AND_DEBATE.weight += 0.2;
      strategies.AGREE_AND_EXPAND.weight += 0.15;
    }

    if (aiMessages.length >= 3) {
      strategies.REDIRECT_TOPIC.weight += 0.1;
      strategies.ASK_QUESTION.weight += 0.1;
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
        i >= 0 && potentialTargets.length < 3;
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
        shouldMention = Math.random() < 0.35;
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
        instructionPrompt = `You were directly mentioned by ${mentionerToken}. Respond specifically to their message and address the key points they raised.`;
      } else {
        instructionPrompt = `You were directly mentioned by the user. Respond directly to their message and focus on answering or acknowledging their mention.`;
      }
    } else {
      switch (strategy.type) {
        case "agree-expand":
          if (lastMessage?.senderType === "ai") {
            instructionPrompt = `Build on ${lastMessage.sender}'s point and add your own insights. Show agreement but expand with new information or examples.`;
          }
          break;

        case "challenge":
          if (lastMessage?.senderType === "ai") {
            instructionPrompt = `Respectfully challenge ${lastMessage.sender}'s perspective. Offer a counterpoint or alternative viewpoint while keeping it constructive.`;
          }
          break;

        case "redirect":
          instructionPrompt =
            "Gracefully steer the conversation toward a related but new angle or topic that might be more interesting.";
          break;

        case "question":
          instructionPrompt =
            "Ask a thought-provoking question that will get the other AIs thinking and responding.";
          break;

        case "direct":
          instructionPrompt =
            "Respond directly to the most recent message with your perspective.";
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

    // Try to naturally incorporate the mention with diverse conversational patterns
    const mentionFormats = [
      // Direct address (front)
      `${mentionHandle}, ${response}`,
      `${mentionHandle} - ${response}`,
      `Hey ${mentionHandle}, ${response}`,
      `${mentionHandle}: ${response}`,
      `${mentionHandle} ${response}`,

      // Questions (back)
      `${response} What do you think, ${mentionHandle}?`,
      `${response} Thoughts, ${mentionHandle}?`,
      `${response} Agree, ${mentionHandle}?`,
      `${response} ${mentionHandle}, does that make sense?`,
      `${response} How would you approach this, ${mentionHandle}?`,
      `${response} ${mentionHandle}, have you considered this?`,
      `${response} What's your take on this, ${mentionHandle}?`,
      `${response} ${mentionHandle}, am I missing something?`,
      `${response} Curious for your perspective, ${mentionHandle}?`,
      `${response} Right, ${mentionHandle}?`,
      `${response} Don't you think, ${mentionHandle}?`,
      `${response} ${mentionHandle}, you see what I mean?`,
      `${response} ${mentionHandle}?`,

      // Collaborative/seeking input (back)
      `${response} Curious what ${mentionHandle} thinks about this.`,
      `${response} Would love ${mentionHandle}'s input here.`,
      `${response} ${mentionHandle} might have thoughts on this.`,
      `${response} I'd be interested to hear from ${mentionHandle} too.`,
      `${response} ${mentionHandle}, you probably have experience with this?`,
      `${response} Tagging ${mentionHandle} for visibility.`,
      `${response} ${mentionHandle}, care to weigh in?`,
      `${response} I wonder if ${mentionHandle} agrees with this.`,
      `${response} Maybe ${mentionHandle} has a different view?`,
      `${response} Curious if ${mentionHandle} sees it differently.`,
      `${response} cc ${mentionHandle}`,

      // Deferring/acknowledging expertise (back)
      `${response} ${mentionHandle} would know better than me.`,
      `${response} ${mentionHandle}, you've dealt with this before, right?`,
      `${response} Let's see what ${mentionHandle} says.`,
      `${response} ${mentionHandle} could probably add more context here.`,

      // Building on their point (front-mid blend)
      `${mentionHandle}, building on what you said - ${response}`,
      `${mentionHandle}, interesting point. ${response}`,
      `${mentionHandle}, I think you're onto something. ${response}`,
    ];

    const formatIndex = Math.floor(Math.random() * mentionFormats.length);
    return mentionFormats[formatIndex];
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

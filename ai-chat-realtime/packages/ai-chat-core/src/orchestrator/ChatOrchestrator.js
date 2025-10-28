/**
 * Chat Orchestrator - Manages multi-AI conversations
 */

import { EventEmitter } from 'events';
import { AIServiceFactory } from '../services/AIServiceFactory.js';
import { ContextManager } from './ContextManager.js';
import { MessageBroker } from './MessageBroker.js';

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
      isAsleep: false
    };
    this.lastAIMessageTime = 0;
    // Fast responses to user messages (1-10 seconds)
    this.minUserResponseDelay = options.minUserResponseDelay || 1000; // 1 second
    this.maxUserResponseDelay = options.maxUserResponseDelay || 10000; // 10 seconds
    // Background AI conversation timing (10-30 seconds)
    this.minBackgroundDelay = options.minBackgroundDelay || 10000; // 10 seconds
    this.maxBackgroundDelay = options.maxBackgroundDelay || 30000; // 30 seconds
    
    this.backgroundConversationTimer = null;
    this.topicChangeChance = options.topicChangeChance || 0.1; // 10% chance

    this.setupMessageBroker();
    this.startBackgroundConversation();
  }

  /**
   * Setup message broker event handlers
   */
  setupMessageBroker() {
    this.messageBroker.on('message-ready', (message) => {
      this.handleMessage(message);
    });

    this.messageBroker.on('broadcast', ({ message, roomId }) => {
      this.emit('message-broadcast', { message, roomId });
    });

    this.messageBroker.on('message-error', ({ message, error }) => {
      this.emit('error', { message, error });
    });
  }

  /**
   * Initialize AI services for the chat
   * @param {Array} aiConfigs - Array of AI configuration objects
   */
  async initializeAIs(aiConfigs) {
    for (const config of aiConfigs) {
      try {
        const service = AIServiceFactory.createServiceByName(config.providerKey, config.modelKey);
        await service.initialize();
        
        const aiId = `${config.providerKey}_${config.modelKey}`;
        this.aiServices.set(aiId, {
          service,
          config,
          id: aiId,
          name: service.getName(),
          isActive: true,
          lastMessageTime: 0
        });
        
        this.activeAIs.push(aiId);
      } catch (error) {
        console.error(`Failed to initialize AI ${config.providerKey}_${config.modelKey}:`, error);
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

    if (message.senderType === 'user') {
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

    if (this.messageTracker.aiMessageCount >= this.messageTracker.maxAIMessages) {
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

    // For user responses: 2-4 AIs respond, for background: 1-2 AIs respond
    const maxResponders = isUserResponse ? 4 : 2;
    const minResponders = isUserResponse ? 2 : 1;
    const respondingAIs = this.selectRespondingAIs(minResponders, maxResponders);
    
    respondingAIs.forEach((aiId, index) => {
      const delay = this.calculateResponseDelay(index, isUserResponse);
      
      setTimeout(() => {
        this.generateAIResponse(aiId, roomId, isUserResponse);
      }, delay);
    });
  }

  /**
   * Select which AIs should respond
   * @param {number} minResponders - Minimum number of responders
   * @param {number} maxResponders - Maximum number of responders
   * @returns {Array} Array of AI IDs that should respond
   */
  selectRespondingAIs(minResponders = 1, maxResponders = 3) {
    const availableAIs = this.activeAIs.filter(aiId => {
      const ai = this.aiServices.get(aiId);
      return ai && ai.isActive;
    });

    // Randomly select between min and max AIs
    const numResponders = Math.min(
      Math.floor(Math.random() * (maxResponders - minResponders + 1)) + minResponders, 
      availableAIs.length
    );
    const shuffled = [...availableAIs].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, numResponders);
  }

  /**
   * Calculate response delay for AI
   * @param {number} index - AI response index
   * @param {boolean} isUserResponse - Whether this is a response to user message
   * @returns {number} Delay in milliseconds
   */
  calculateResponseDelay(index, isUserResponse = true) {
    let baseDelay;
    
    if (isUserResponse) {
      // Fast responses to user messages (1-10 seconds)
      baseDelay = this.minUserResponseDelay + 
        Math.random() * (this.maxUserResponseDelay - this.minUserResponseDelay);
    } else {
      // Background conversation timing (10-30 seconds)
      baseDelay = this.minBackgroundDelay + 
        Math.random() * (this.maxBackgroundDelay - this.minBackgroundDelay);
    }
    
    // Stagger responses to prevent simultaneous responses
    const staggerDelay = index * (Math.random() * 3000 + 1000); // Reduced stagger for faster responses
    
    return Math.floor(baseDelay + staggerDelay);
  }

  /**
   * Generate AI response
   * @param {string} aiId - AI service ID
   * @param {string} roomId - Room ID
   * @param {boolean} isUserResponse - Whether this is a response to user message
   */
  async generateAIResponse(aiId, roomId, isUserResponse = true) {
    if (this.messageTracker.isAsleep) {
      return;
    }

    const aiService = this.aiServices.get(aiId);
    if (!aiService || !aiService.isActive) {
      return;
    }

    try {
      console.log(`🤖 ${aiService.name} is generating ${isUserResponse ? 'user response' : 'background message'}...`);
      
      // Check if AI should change topic (lower chance for user responses)
      const shouldChangeTopic = !isUserResponse && Math.random() < this.topicChangeChance;
      
      let context = this.contextManager.getContextForAI(20);
      let responseType = 'response';
      
      // Modify context based on response type
      if (shouldChangeTopic) {
        responseType = 'topic-change';
        context = this.enhanceContextForTopicChange(context);
      } else if (!isUserResponse && context.length > 0) {
        // For background messages, sometimes comment on previous AI messages
        const lastMessage = context[context.length - 1];
        if (lastMessage?.senderType === 'ai' && Math.random() < 0.4) {
          responseType = 'comment';
          context = this.enhanceContextForComment(context, lastMessage);
        }
      }

      const response = await aiService.service.generateResponse(context);
      const truncatedResponse = this.truncateResponse(response);
      
      console.log(`✨ ${aiService.name} ${responseType}: ${truncatedResponse.substring(0, 100)}${truncatedResponse.length > 100 ? '...' : ''}`);

      const aiMessage = {
        sender: aiService.name,
        content: truncatedResponse,
        senderType: 'ai',
        roomId,
        aiId,
        responseType,
        priority: isUserResponse ? 500 : 0
      };

      // Queue the AI response
      this.messageBroker.enqueueMessage(aiMessage);
      
    } catch (error) {
      console.error(`❌ AI ${aiId} failed to generate response:`, error.message);
      this.emit('ai-error', { aiId, error });
    }
  }

  /**
   * Truncate AI response to keep it concise (2-3 sentences max)
   * @param {string} response - Original AI response
   * @returns {string} Truncated response
   */
  truncateResponse(response) {
    if (!response || typeof response !== 'string') {
      return response;
    }

    // Split into sentences (looking for periods, exclamation marks, question marks)
    const sentences = response.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    
    // Keep max 2-3 sentences
    const maxSentences = 3;
    if (sentences.length <= maxSentences) {
      return response.trim();
    }

    // Take first 2-3 sentences and ensure they end properly
    let truncated = sentences.slice(0, maxSentences).join(' ').trim();
    
    // Ensure it ends with proper punctuation
    if (!truncated.match(/[.!?]$/)) {
      truncated += '.';
    }
    
    return truncated;
  }

  /**
   * Wake up AIs (reset message counter)
   */
  wakeUpAIs() {
    this.messageTracker.aiMessageCount = 0;
    this.messageTracker.isAsleep = false;
    this.emit('ais-awakened');
    
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
    this.emit('ais-sleeping', { reason: 'message-limit-reached' });
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
      sender: 'System',
      content: `Topic changed to: "${newTopic}" by ${changedBy}`,
      senderType: 'system',
      roomId,
      priority: 1000 // High priority for system messages
    };

    this.addMessage(topicMessage);
    this.emit('topic-changed', { newTopic, changedBy, roomId });
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
      queueStatus: this.messageBroker.getQueueStatus()
    };
  }

  /**
   * Start background conversation between AIs
   */
  startBackgroundConversation() {
    const scheduleNextMessage = () => {
      if (this.messageTracker.isAsleep || this.activeAIs.length === 0) {
        // Retry in 30 seconds if AIs are asleep
        this.backgroundConversationTimer = setTimeout(scheduleNextMessage, 30000);
        return;
      }

      const delay = this.minBackgroundDelay + 
        Math.random() * (this.maxBackgroundDelay - this.minBackgroundDelay);

      this.backgroundConversationTimer = setTimeout(() => {
        // Only generate background messages if there has been recent activity
        const timeSinceLastMessage = Date.now() - this.lastAIMessageTime;
        if (timeSinceLastMessage > 120000) { // 2 minutes of silence
          scheduleNextMessage();
          return;
        }

        // Generate background AI message
        this.scheduleAIResponses('default', false); // false = background message
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
      sender: 'System',
      content: 'Feel free to introduce a new interesting topic or shift the conversation in a different direction.',
      senderType: 'system',
      isInternal: true
    });
    return enhancedContext;
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
      sender: 'System',
      content: `Consider commenting on or building upon ${lastMessage.sender}'s message: "${lastMessage.content}"`,
      senderType: 'system',
      isInternal: true
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
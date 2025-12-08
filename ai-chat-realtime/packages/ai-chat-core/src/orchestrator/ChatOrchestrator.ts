/**
 * Chat Orchestrator - Manages multi-AI conversations
 *
 * This is the main orchestrator class, now refactored to use modular components
 * for strategy management, scheduling, and prompt building. This significantly
 * reduces complexity and improves maintainability.
 */

import { EventEmitter } from 'events';
import { AIServiceFactory } from '../services/AIServiceFactory.js';
import { ContextManager } from './ContextManager.js';
import { MessageBroker } from './MessageBroker.js';
import { InteractionStrategyManager } from './strategies/InteractionStrategyManager.js';
import { MentionHandler } from './strategies/MentionHandler.js';
import { ResponseScheduler } from './scheduling/ResponseScheduler.js';
import { BackgroundConversationManager } from './scheduling/BackgroundConversationManager.js';
import { SystemPromptBuilder } from './prompts/SystemPromptBuilder.js';

import {
  IChatOrchestrator,
  ChatOrchestratorConfig,
  OrchestratorState,
  OrchestratorEvent,
  OrchestratorEventData,
  OrchestratorError,
  AIParticipant,
  AIParticipantConfig,
  InteractionStrategy,
  StrategyContext,
  SchedulingContext,
  BackgroundConversationState,
  MentionContext
} from '../types/orchestrator.js';

import {
  Message,
  IAIService,
  AIServiceConfig,
  AIProvider,
  AIModel
} from '../types/index.js';

export class ChatOrchestrator extends EventEmitter implements IChatOrchestrator {
  private config: ChatOrchestratorConfig;
  private contextManager: ContextManager;
  private messageBroker: MessageBroker;
  private strategyManager: InteractionStrategyManager;
  private mentionHandler: MentionHandler;
  private responseScheduler: ResponseScheduler;
  private backgroundManager: BackgroundConversationManager;
  private promptBuilder: SystemPromptBuilder;

  // State management
  private aiServices: Map<string, IAIService> = new Map();
  private activeAIs: AIParticipant[] = [];
  private messageHistory: Message[] = [];
  private lastUserMessageTime: number = 0;
  private isShuttingDown: boolean = false;

  constructor(config: Partial<ChatOrchestratorConfig> = {}) {
    super();

    this.config = {
      maxConcurrentChats: 10,
      defaultTimeout: 30000,
      retryAttempts: 3,
      maxMessageHistory: 100,
      enableBackgroundConversation: true,
      silenceTimeoutMs: 30000,
      responseCooldownMs: 2000,
      maxResponseLength: 4000,
      ...config
    };

    this.initializeComponents();
    this.setupEventHandlers();
  }

  /**
   * Initialize all sub-components
   */
  private initializeComponents(): void {
    this.contextManager = new ContextManager(this.config.maxMessageHistory);
    this.messageBroker = new MessageBroker();
    this.strategyManager = new InteractionStrategyManager();
    this.mentionHandler = new MentionHandler();
    this.responseScheduler = new ResponseScheduler({
      baseDelayMs: this.config.responseCooldownMs || 2000,
      maxDelayMs: 10000,
      minDelayMs: 500
    });
    this.backgroundManager = new BackgroundConversationManager({
      enabled: this.config.enableBackgroundConversation,
      triggerSilenceMs: this.config.silenceTimeoutMs
    });
    this.promptBuilder = new SystemPromptBuilder({
      maxContextLength: this.config.maxResponseLength
    });
  }

  /**
   * Set up event handlers between components
   */
  private setupEventHandlers(): void {
    this.messageBroker.on('message', (data) => {
      this.handleBrokerMessage(data);
    });

    this.messageBroker.on('error', (error) => {
      this.emit('error', new OrchestratorError('Message broker error', 'message_broker', { error }));
    });

    // Handle background conversation events
    this.backgroundManager.start(this.activeAIs);
  }

  /**
   * Initialize the orchestrator
   */
  async initialize(config?: ChatOrchestratorConfig): Promise<void> {
    try {
      if (config) {
        this.config = { ...this.config, ...config };
        this.initializeComponents();
      }

      this.emit('initialized', { timestamp: Date.now() });
    } catch (error) {
      throw new OrchestratorError(
        `Failed to initialize orchestrator: ${error instanceof Error ? error.message : String(error)}`,
        'initialization'
      );
    }
  }

  /**
   * Add an AI service to the orchestrator
   */
  async addAIService(service: IAIService, config: AIParticipantConfig): Promise<void> {
    try {
      if (this.aiServices.has(service.getName())) {
        throw new OrchestratorError(`Service ${service.getName()} already exists`, 'add_service');
      }

      // Initialize the service if needed
      if (!service.isInitialized?.()) {
        await service.initialize();
      }

      const participant: AIParticipant = {
        id: service.getName(),
        service,
        provider: service.getConfig().provider as AIProvider,
        model: service.getConfig().model as AIModel,
        alias: config.alias || service.getName(),
        normalizedAlias: this.mentionHandler.normalizeAlias(config.alias || service.getName()),
        isActive: config.initiallyActive !== false,
        isSleeping: false,
        messageCount: 0,
        metadata: {
          addedAt: Date.now(),
          customPrompt: config.customPrompt,
          responseStyle: config.responseStyle
        }
      };

      this.aiServices.set(service.getName(), service);
      this.activeAIs.push(participant);

      this.emit('participant_added', { participant, timestamp: Date.now() });

      // Update background conversation participants
      this.backgroundManager.start(this.activeAIs);

    } catch (error) {
      throw new OrchestratorError(
        `Failed to add AI service: ${error instanceof Error ? error.message : String(error)}`,
        'add_service',
        { serviceName: service.getName() }
      );
    }
  }

  /**
   * Remove an AI service from the orchestrator
   */
  async removeAIService(serviceId: string): Promise<void> {
    try {
      const service = this.aiServices.get(serviceId);
      if (!service) {
        throw new OrchestratorError(`Service ${serviceId} not found`, 'remove_service');
      }

      // Cancel any scheduled responses for this service
      this.responseScheduler.cancelScheduleForParticipant(serviceId);

      // Remove from collections
      this.aiServices.delete(serviceId);
      this.activeAIs = this.activeAIs.filter(ai => ai.id !== serviceId);

      // Shutdown the service
      if (service.shutdown) {
        await service.shutdown();
      }

      this.emit('participant_removed', { serviceId, timestamp: Date.now() });

    } catch (error) {
      throw new OrchestratorError(
        `Failed to remove AI service: ${error instanceof Error ? error.message : String(error)}`,
        'remove_service',
        { serviceId }
      );
    }
  }

  /**
   * Process an incoming message
   */
  async processMessage(message: Message): Promise<void> {
    try {
      if (this.isShuttingDown) {
        return;
      }

      // Add to message history
      this.messageHistory.push(message);
      this.contextManager.addMessage(message);

      // Update timing
      if (message.role === 'user') {
        this.lastUserMessageTime = Date.now();
        this.backgroundManager.resetState();
      }

      // Detect mentions
      const mentions = this.mentionHandler.detectMentions(message, this.activeAIs);

      // Determine strategy
      const strategyContext: StrategyContext = {
        recentMessages: this.messageHistory.slice(-10),
        aiParticipants: this.activeAIs,
        currentSpeaker: message.role,
        messageCount: this.messageHistory.length,
        silenceDurationMs: Date.now() - this.lastUserMessageTime
      };

      const strategyDecision = this.strategyManager.determineStrategy(strategyContext);

      // Select responding AIs
      const respondingAIs = this.responseScheduler.selectRespondingAIs(
        this.activeAIs,
        mentions,
        strategyDecision.selectedStrategy
      );

      if (respondingAIs.length > 0) {
        await this.generateResponses(message, strategyDecision.selectedStrategy);
      }

      this.emit('message_processed', {
        message,
        mentions,
        strategy: strategyDecision,
        respondingAIs: respondingAIs.length,
        timestamp: Date.now()
      });

    } catch (error) {
      this.emit('error', new OrchestratorError(
        `Failed to process message: ${error instanceof Error ? error.message : String(error)}`,
        'process_message',
        { message }
      ));
    }
  }

  /**
   * Generate responses from selected AIs
   */
  async generateResponses(message: Message, strategy?: InteractionStrategy): Promise<Message[]> {
    try {
      const responses: Message[] = [];
      const context = this.contextManager.getContext();

      // Determine strategy if not provided
      const selectedStrategy = strategy || this.strategyManager.determineStrategy({
        recentMessages: context,
        aiParticipants: this.activeAIs,
        currentSpeaker: message.role,
        messageCount: this.messageHistory.length,
        silenceDurationMs: Date.now() - this.lastUserMessageTime
      }).selectedStrategy;

      // Get active participants
      const activeParticipants = this.activeAIs.filter(ai => ai.isActive && !ai.isSleeping);

      // Create scheduling context
      const schedulingContext: SchedulingContext = {
        activeResponders: activeParticipants,
        queuedResponses: [],
        lastResponseTime: Date.now(),
        averageResponseTime: 2000,
        typingAwareDelays: true
      };

      // Schedule responses
      const schedule = this.responseScheduler.scheduleResponses(
        activeParticipants,
        selectedStrategy,
        schedulingContext
      );

      // Generate responses for each scheduled participant
      for (const item of schedule) {
        try {
          const response = await this.generateParticipantResponse(
            item.participant,
            context,
            selectedStrategy
          );

          if (response) {
            responses.push(response);
            this.messageHistory.push(response);
            this.contextManager.addMessage(response);

            // Update participant state
            item.participant.lastResponseTime = Date.now();
            item.participant.messageCount++;

            this.emit('response_generated', {
              participant: item.participant,
              response,
              strategy: selectedStrategy,
              timestamp: Date.now()
            });
          }
        } catch (error) {
          this.emit('error', new OrchestratorError(
            `Failed to generate response for ${item.participant.id}`,
            'generate_response',
            { participant: item.participant.id, error }
          ));
        }
      }

      return responses;

    } catch (error) {
      throw new OrchestratorError(
        `Failed to generate responses: ${error instanceof Error ? error.message : String(error)}`,
        'generate_responses',
        { strategy }
      );
    }
  }

  /**
   * Get active participants
   */
  getActiveParticipants(): AIParticipant[] {
    return this.activeAIs.filter(ai => ai.isActive);
  }

  /**
   * Set participant active status
   */
  setParticipantActive(participantId: string, active: boolean): void {
    const participant = this.activeAIs.find(ai => ai.id === participantId);
    if (participant) {
      participant.isActive = active;
      this.emit('participant_status_changed', { participantId, active, timestamp: Date.now() });
    }
  }

  /**
   * Find participant by alias
   */
  findParticipantByAlias(alias: string): AIParticipant | undefined {
    return this.mentionHandler.findAIByAlias(alias, this.activeAIs);
  }

  /**
   * Determine interaction strategy (delegated to strategy manager)
   */
  determineInteractionStrategy(context: StrategyContext): any {
    return this.strategyManager.determineStrategy(context);
  }

  /**
   * Schedule responses (delegated to response scheduler)
   */
  scheduleResponses(participants: AIParticipant[], strategy: InteractionStrategy): any[] {
    const schedulingContext: SchedulingContext = {
      activeResponders: participants,
      queuedResponses: [],
      lastResponseTime: this.lastUserMessageTime,
      averageResponseTime: 2000,
      typingAwareDelays: true
    };

    return this.responseScheduler.scheduleResponses(participants, strategy, schedulingContext);
  }

  /**
   * Start background conversation
   */
  startBackgroundConversation(): void {
    this.backgroundManager.start(this.activeAIs);
  }

  /**
   * Stop background conversation
   */
  stopBackgroundConversation(): void {
    this.backgroundManager.stop();
  }

  /**
   * Put participants to sleep
   */
  putParticipantsToSleep(participants: AIParticipant[]): void {
    this.backgroundManager.putParticipantsToSleep(participants);
  }

  /**
   * Wake up participants
   */
  wakeUpParticipants(participants: AIParticipant[]): void {
    this.backgroundManager.wakeUpParticipants(participants);
  }

  /**
   * Get current orchestrator state
   */
  getState(): OrchestratorState {
    return {
      aiServices: this.aiServices,
      activeAIs: this.activeAIs,
      sleepingAIs: new Set(this.activeAIs.filter(ai => ai.isSleeping).map(ai => ai.id)),
      messageHistory: this.messageHistory,
      lastUserMessageTime: this.lastUserMessageTime,
      backgroundConversation: this.backgroundManager.getState(),
      scheduling: {
        activeResponders: this.activeAIs.filter(ai => ai.isActive && !ai.isSleeping),
        queuedResponses: [],
        lastResponseTime: this.lastUserMessageTime,
        averageResponseTime: 2000,
        typingAwareDelays: true
      }
    };
  }

  /**
   * Shutdown the orchestrator
   */
  async shutdown(): Promise<void> {
    try {
      this.isShuttingDown = true;

      // Stop background conversation
      this.backgroundManager.stop();

      // Cancel all scheduled responses
      this.responseScheduler.cancelAllSchedules();

      // Shutdown all services
      for (const [serviceId, service] of this.aiServices.entries()) {
        try {
          if (service.shutdown) {
            await service.shutdown();
          }
        } catch (error) {
          this.emit('error', new OrchestratorError(
            `Failed to shutdown service ${serviceId}`,
            'shutdown',
            { serviceId, error }
          ));
        }
      }

      // Clear collections
      this.aiServices.clear();
      this.activeAIs = [];
      this.messageHistory = [];

      this.emit('shutdown', { timestamp: Date.now() });

    } catch (error) {
      throw new OrchestratorError(
        `Failed to shutdown orchestrator: ${error instanceof Error ? error.message : String(error)}`,
        'shutdown'
      );
    }
  }

  /**
   * Handle broker messages
   */
  private handleBrokerMessage(data: any): void {
    // Handle different types of broker messages
    // This would be implemented based on specific message broker needs
  }

  /**
   * Format recent context for prompts
   */
  private formatRecentContext(context: Message[]): string {
    return context.slice(-5)
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');
  }

  /**
   * Extract conversation topic from context
   */
  private extractConversationTopic(context: Message[]): string | undefined {
    // Simple topic extraction - could be enhanced with NLP
    const recentUserMessages = context
      .filter(msg => msg.role === 'user')
      .slice(-3);

    if (recentUserMessages.length > 0) {
      const lastUserMessage = recentUserMessages[recentUserMessages.length - 1];
      return lastUserMessage.content.slice(0, 100);
    }

    return undefined;
  }

  /**
   * Generate response for a specific participant
   */
  private async generateParticipantResponse(
    participant: AIParticipant,
    context: Message[],
    strategy: InteractionStrategy
  ): Promise<Message | null> {
    try {
      // Build enhanced system prompt
      const promptContext = {
        strategy,
        recentContext: this.formatRecentContext(context),
        participantCount: this.activeAIs.length,
        conversationTopic: this.extractConversationTopic(context)
      };

      const basePrompt = participant.model.systemPrompt || '';
      const enhancedPrompt = this.promptBuilder.buildPrompt(basePrompt, promptContext, participant);

      // Create messages with enhanced system prompt
      const enhancedContext = [
        { role: 'system' as const, content: enhancedPrompt },
        ...context.slice(-10) // Last 10 messages for context
      ];

      // Generate response using the service
      const serviceResponse = await participant.service.generateResponse(enhancedContext);

      if (!serviceResponse.content?.trim()) {
        return null;
      }

      // Truncate response if needed
      const truncatedContent = this.promptBuilder.truncateResponse(
        serviceResponse.content,
        this.config.maxResponseLength || 4000
      );

      return {
        role: 'assistant',
        content: truncatedContent,
        timestamp: Date.now(),
        metadata: {
          participant: participant.id,
          provider: participant.provider.name,
          model: participant.model.id,
          strategy,
          usage: serviceResponse.usage
        }
      };

    } catch (error) {
      throw new OrchestratorError(
        `Failed to generate response for participant ${participant.id}`,
        'participant_response',
        { participant: participant.id, error }
      );
    }
  }
}

/**
 * Message Broker - Routes messages between users and AI systems
 */

import { EventEmitter } from 'events';
import {
  IMessageBroker,
  MessageBrokerConfig,
  QueuedMessage,
  QueueStatus,
  BrokerEvent
} from '@/types/orchestrator.js';
import { Message } from '@/types/index.js';

export class MessageBroker extends EventEmitter implements IMessageBroker {
  private messageQueue: QueuedMessage[] = [];
  private isProcessing = false;
  private config: MessageBrokerConfig;

  constructor(config?: Partial<MessageBrokerConfig>) {
    super();
    this.config = {
      maxQueueSize: 1000,
      processingDelayMs: 10,
      defaultUserPriority: 1000,
      defaultAIPriority: 0,
      enablePriorityQueuing: true,
      ...config
    };
  }

  /**
   * Add a message to the processing queue
   */
  enqueueMessage(message: Message, priority?: number): void {
    // Check queue size limit
    if (this.messageQueue.length >= this.config.maxQueueSize) {
      this.emit('error' as BrokerEvent, new Error('Message queue is full'));
      return;
    }

    const queueMessage: QueuedMessage = {
      ...message,
      timestamp: message.timestamp || Date.now(),
      id: message.id || this.generateMessageId(),
      priority: this.determinePriority(message, priority),
      queuedAt: Date.now()
    };

    if (this.config.enablePriorityQueuing) {
      this.insertByPriority(queueMessage);
    } else {
      this.messageQueue.push(queueMessage);
    }

    this.emit('message-queued' as BrokerEvent, queueMessage);

    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process the message queue
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing || this.messageQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    this.emit('processing-started' as BrokerEvent, { timestamp: Date.now() });

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (!message) break;

      try {
        // Emit message for processing
        this.emit('message' as BrokerEvent, message);
        this.emit('message-ready' as BrokerEvent, message);

        // Small delay to prevent overwhelming
        await this.sleep(this.config.processingDelayMs);
      } catch (error) {
        this.emit('message-error' as BrokerEvent, { message, error });
        this.emit('error' as BrokerEvent, error);
      }
    }

    this.isProcessing = false;
    this.emit('processing-completed' as BrokerEvent, { timestamp: Date.now() });
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcastMessage(message: Message, roomId?: string): void {
    this.emit('broadcast' as BrokerEvent, { message, roomId });
  }

  /**
   * Get queue status
   */
  getQueueStatus(): QueueStatus {
    return {
      queueLength: this.messageQueue.length,
      isProcessing: this.isProcessing,
      nextMessage: this.messageQueue[0] || null,
      maxQueueSize: this.config.maxQueueSize,
      utilizationPercent: (this.messageQueue.length / this.config.maxQueueSize) * 100
    };
  }

  /**
   * Clear the message queue
   */
  clearQueue(): void {
    const clearedCount = this.messageQueue.length;
    this.messageQueue = [];
    this.isProcessing = false;

    this.emit('queue-cleared' as BrokerEvent, { clearedCount, timestamp: Date.now() });
  }

  /**
   * Get messages for a specific room
   */
  getQueuedMessagesForRoom(roomId: string): QueuedMessage[] {
    return this.messageQueue.filter(msg =>
      (msg as any).roomId === roomId
    );
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MessageBrokerConfig>): void {
    this.config = { ...this.config, ...config };

    // If max queue size was reduced, trim the queue
    if (config.maxQueueSize && this.messageQueue.length > config.maxQueueSize) {
      const removed = this.messageQueue.splice(config.maxQueueSize);
      this.emit('queue-trimmed' as BrokerEvent, {
        removedCount: removed.length,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): MessageBrokerConfig {
    return { ...this.config };
  }

  /**
   * Get broker metrics
   */
  getMetrics(): Record<string, unknown> {
    const status = this.getQueueStatus();
    const averagePriority = this.messageQueue.length > 0
      ? this.messageQueue.reduce((sum, msg) => sum + msg.priority, 0) / this.messageQueue.length
      : 0;

    return {
      ...status,
      averagePriority,
      config: this.config,
      uptime: process.uptime() * 1000,
      priorityDistribution: this.getPriorityDistribution()
    };
  }

  /**
   * Pause message processing
   */
  pauseProcessing(): void {
    this.isProcessing = true; // Prevent new processing
    this.emit('processing-paused' as BrokerEvent, { timestamp: Date.now() });
  }

  /**
   * Resume message processing
   */
  resumeProcessing(): void {
    this.isProcessing = false;
    this.emit('processing-resumed' as BrokerEvent, { timestamp: Date.now() });

    if (this.messageQueue.length > 0) {
      this.processQueue();
    }
  }

  /**
   * Remove messages matching a predicate
   */
  removeMessages(predicate: (message: QueuedMessage) => boolean): number {
    const initialLength = this.messageQueue.length;
    this.messageQueue = this.messageQueue.filter(msg => !predicate(msg));
    const removedCount = initialLength - this.messageQueue.length;

    if (removedCount > 0) {
      this.emit('messages-removed' as BrokerEvent, {
        removedCount,
        timestamp: Date.now()
      });
    }

    return removedCount;
  }

  /**
   * Insert message into queue based on priority
   */
  private insertByPriority(message: QueuedMessage): void {
    let inserted = false;
    for (let i = 0; i < this.messageQueue.length; i++) {
      if (message.priority > this.messageQueue[i].priority) {
        this.messageQueue.splice(i, 0, message);
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      this.messageQueue.push(message);
    }
  }

  /**
   * Determine message priority
   */
  private determinePriority(message: Message, explicitPriority?: number): number {
    if (explicitPriority !== undefined) {
      return explicitPriority;
    }

    // Determine priority based on message properties
    const senderType = (message as any).senderType;
    if (senderType === 'user') {
      return this.config.defaultUserPriority;
    }

    return (message as any).priority ?? this.config.defaultAIPriority;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get priority distribution for metrics
   */
  private getPriorityDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {};

    this.messageQueue.forEach(msg => {
      const priorityRange = this.getPriorityRange(msg.priority);
      distribution[priorityRange] = (distribution[priorityRange] || 0) + 1;
    });

    return distribution;
  }

  /**
   * Get priority range label for grouping
   */
  private getPriorityRange(priority: number): string {
    if (priority >= 1000) return 'user';
    if (priority >= 100) return 'high';
    if (priority >= 10) return 'medium';
    return 'low';
  }
}
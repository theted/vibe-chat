/**
 * Message Broker - Routes messages between users and AI systems
 */
import { EventEmitter } from 'events';
import { IMessageBroker, MessageBrokerConfig, QueuedMessage, QueueStatus } from '../types/orchestrator.js';
import { Message } from '../types/index.js';
export declare class MessageBroker extends EventEmitter implements IMessageBroker {
    private messageQueue;
    private isProcessing;
    private config;
    constructor(config?: Partial<MessageBrokerConfig>);
    /**
     * Add a message to the processing queue
     */
    enqueueMessage(message: Message, priority?: number): void;
    /**
     * Process the message queue
     */
    processQueue(): Promise<void>;
    /**
     * Broadcast message to all connected clients
     */
    broadcastMessage(message: Message, roomId?: string): void;
    /**
     * Get queue status
     */
    getQueueStatus(): QueueStatus;
    /**
     * Clear the message queue
     */
    clearQueue(): void;
    /**
     * Get messages for a specific room
     */
    getQueuedMessagesForRoom(roomId: string): QueuedMessage[];
    /**
     * Update configuration
     */
    updateConfig(config: Partial<MessageBrokerConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): MessageBrokerConfig;
    /**
     * Get broker metrics
     */
    getMetrics(): Record<string, unknown>;
    /**
     * Pause message processing
     */
    pauseProcessing(): void;
    /**
     * Resume message processing
     */
    resumeProcessing(): void;
    /**
     * Remove messages matching a predicate
     */
    removeMessages(predicate: (message: QueuedMessage) => boolean): number;
    /**
     * Insert message into queue based on priority
     */
    private insertByPriority;
    /**
     * Determine message priority
     */
    private determinePriority;
    /**
     * Generate unique message ID
     */
    private generateMessageId;
    /**
     * Sleep utility
     */
    private sleep;
    /**
     * Get priority distribution for metrics
     */
    private getPriorityDistribution;
    /**
     * Get priority range label for grouping
     */
    private getPriorityRange;
}
//# sourceMappingURL=MessageBroker.d.ts.map
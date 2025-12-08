/**
 * Message Broker - Routes messages between users and AI systems
 */
import { EventEmitter } from 'events';
interface QueueMessage {
    id: string;
    sender: string;
    content: string;
    senderType: 'user' | 'ai';
    roomId: string;
    priority: number;
    timestamp: number;
}
interface QueueStatus {
    queueLength: number;
    isProcessing: boolean;
    nextMessage: QueueMessage | null;
}
export declare class MessageBroker extends EventEmitter {
    private messageQueue;
    private isProcessing;
    constructor();
    /**
     * Add a message to the processing queue
     * @param message - Message object
     */
    enqueueMessage(message: Omit<QueueMessage, 'id' | 'timestamp' | 'priority'>): void;
    /**
     * Insert message into queue based on priority
     * @param message - Message to insert
     */
    private insertByPriority;
    /**
     * Process the message queue
     */
    private processQueue;
    /**
     * Broadcast message to all connected clients
     * @param message - Message to broadcast
     * @param roomId - Room to broadcast to
     */
    broadcastMessage(message: QueueMessage, roomId: string): void;
    /**
     * Generate unique message ID
     * @returns Unique message ID
     */
    private generateMessageId;
    /**
     * Get queue status
     * @returns Queue status information
     */
    getQueueStatus(): QueueStatus;
    /**
     * Clear the message queue
     */
    clearQueue(): void;
    /**
     * Sleep utility
     * @param ms - Milliseconds to sleep
     */
    private sleep;
    /**
     * Get messages for a specific room
     * @param roomId - Room ID
     * @returns Messages in the room queue
     */
    getQueuedMessagesForRoom(roomId: string): QueueMessage[];
}
export {};
//# sourceMappingURL=MessageBroker.d.ts.map
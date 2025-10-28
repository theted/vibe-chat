/**
 * Message Broker - Routes messages between users and AI systems
 */

import { EventEmitter } from 'events';

export class MessageBroker extends EventEmitter {
  constructor() {
    super();
    this.messageQueue = [];
    this.isProcessing = false;
  }

  /**
   * Add a message to the processing queue
   * @param {Object} message - Message object
   * @param {string} message.sender - Message sender
   * @param {string} message.content - Message content
   * @param {string} message.senderType - 'user' or 'ai'
   * @param {string} message.roomId - Room ID
   * @param {number} message.priority - Message priority (higher = more important)
   */
  enqueueMessage(message) {
    const queueMessage = {
      ...message,
      timestamp: Date.now(),
      id: this.generateMessageId()
    };

    // Insert message based on priority (users get higher priority)
    const priority = message.senderType === 'user' ? 1000 : (message.priority || 0);
    queueMessage.priority = priority;

    this.insertByPriority(queueMessage);
    this.emit('message-queued', queueMessage);
    
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Insert message into queue based on priority
   * @param {Object} message - Message to insert
   */
  insertByPriority(message) {
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
   * Process the message queue
   */
  async processQueue() {
    if (this.isProcessing || this.messageQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      
      try {
        // Emit message for processing
        this.emit('message-ready', message);
        
        // Small delay to prevent overwhelming
        await this.sleep(10);
      } catch (error) {
        this.emit('message-error', { message, error });
      }
    }

    this.isProcessing = false;
  }

  /**
   * Broadcast message to all connected clients
   * @param {Object} message - Message to broadcast
   * @param {string} roomId - Room to broadcast to
   */
  broadcastMessage(message, roomId) {
    this.emit('broadcast', { message, roomId });
  }

  /**
   * Generate unique message ID
   * @returns {string} Unique message ID
   */
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get queue status
   * @returns {Object} Queue status information
   */
  getQueueStatus() {
    return {
      queueLength: this.messageQueue.length,
      isProcessing: this.isProcessing,
      nextMessage: this.messageQueue[0] || null
    };
  }

  /**
   * Clear the message queue
   */
  clearQueue() {
    this.messageQueue = [];
    this.isProcessing = false;
  }

  /**
   * Sleep utility
   * @param {number} ms - Milliseconds to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get messages for a specific room
   * @param {string} roomId - Room ID
   * @returns {Array} Messages in the room queue
   */
  getQueuedMessagesForRoom(roomId) {
    return this.messageQueue.filter(msg => msg.roomId === roomId);
  }
}
/**
 * Context Manager - Handles conversation context with sliding window
 */

export class ContextManager {
  constructor(maxMessages = 100) {
    this.messages = [];
    this.maxMessages = maxMessages;
  }

  /**
   * Add a message to the context
   * @param {Object} message - Message object with role, content, timestamp, sender
   */
  addMessage(message) {
    // Skip internal system messages - they're only for AI prompting
    if (message.isInternal) {
      return;
    }

    const contextMessage = {
      role: message.senderType === 'user' ? 'user' : 'assistant',
      content: message.content,
      timestamp: message.timestamp,
      sender: message.sender,
      senderType: message.senderType
    };

    if (this.messages.length >= this.maxMessages) {
      this.messages.shift(); // Remove oldest message
    }
    
    this.messages.push(contextMessage);
  }

  /**
   * Get context for AI (recent messages)
   * @param {number} limit - Number of recent messages to include
   * @returns {Array} Array of messages for AI context
   */
  getContextForAI(limit = 50) {
    return this.messages.slice(-limit);
  }

  /**
   * Get all messages in context
   * @returns {Array} All messages in context
   */
  getAllMessages() {
    return [...this.messages];
  }

  /**
   * Clear the context
   */
  clear() {
    this.messages = [];
  }

  /**
   * Get the number of messages in context
   * @returns {number} Number of messages
   */
  size() {
    return this.messages.length;
  }

  /**
   * Check if context has any messages
   * @returns {boolean} True if context has messages
   */
  hasMessages() {
    return this.messages.length > 0;
  }

  /**
   * Get the last message
   * @returns {Object|null} Last message or null if empty
   */
  getLastMessage() {
    return this.messages.length > 0 ? this.messages[this.messages.length - 1] : null;
  }

  /**
   * Get messages from a specific sender
   * @param {string} sender - Sender name/ID
   * @returns {Array} Messages from the sender
   */
  getMessagesBySender(sender) {
    return this.messages.filter(msg => msg.sender === sender);
  }
}
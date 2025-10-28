/**
 * AI Message Tracker - Tracks AI message limits per room
 */

export class AIMessageTracker {
  constructor() {
    this.roomTrackers = new Map(); // roomId -> tracker data
    this.defaultMaxMessages = 10;
  }

  /**
   * Initialize tracker for a room
   * @param {string} roomId - Room identifier
   * @param {Object} options - Tracker options
   */
  initializeRoom(roomId, options = {}) {
    const tracker = {
      messageCount: 0,
      maxMessages: options.maxMessages || this.defaultMaxMessages,
      isAsleep: false,
      lastResetTime: Date.now(),
      lastAIMessageTime: 0,
      sleepReason: null
    };

    this.roomTrackers.set(roomId, tracker);
  }

  /**
   * Check if AIs can send message in room
   * @param {string} roomId - Room identifier
   * @returns {boolean} True if AIs can send message
   */
  canAISendMessage(roomId) {
    const tracker = this.getOrCreateTracker(roomId);
    return !tracker.isAsleep && tracker.messageCount < tracker.maxMessages;
  }

  /**
   * Record AI message sent
   * @param {string} roomId - Room identifier
   * @param {string} aiId - AI identifier
   */
  onAIMessageSent(roomId, aiId) {
    const tracker = this.getOrCreateTracker(roomId);
    tracker.messageCount++;
    tracker.lastAIMessageTime = Date.now();

    if (tracker.messageCount >= tracker.maxMessages) {
      this.putAIsToSleep(roomId, 'message-limit-reached');
    }
  }

  /**
   * Record user message - wakes up AIs
   * @param {string} roomId - Room identifier
   * @param {string} username - Username
   */
  onUserMessage(roomId, username) {
    const tracker = this.getOrCreateTracker(roomId);
    this.wakeUpAIs(roomId, `user-message-from-${username}`);
  }

  /**
   * Put AIs to sleep in a room
   * @param {string} roomId - Room identifier
   * @param {string} reason - Sleep reason
   */
  putAIsToSleep(roomId, reason = 'manual') {
    const tracker = this.getOrCreateTracker(roomId);
    tracker.isAsleep = true;
    tracker.sleepReason = reason;
  }

  /**
   * Wake up AIs in a room
   * @param {string} roomId - Room identifier
   * @param {string} reason - Wake reason
   */
  wakeUpAIs(roomId, reason = 'manual') {
    const tracker = this.getOrCreateTracker(roomId);
    tracker.messageCount = 0;
    tracker.isAsleep = false;
    tracker.sleepReason = null;
    tracker.lastResetTime = Date.now();
  }

  /**
   * Get tracker for room (create if not exists)
   * @param {string} roomId - Room identifier
   * @returns {Object} Tracker data
   */
  getOrCreateTracker(roomId) {
    if (!this.roomTrackers.has(roomId)) {
      this.initializeRoom(roomId);
    }
    return this.roomTrackers.get(roomId);
  }

  /**
   * Get tracker status for room
   * @param {string} roomId - Room identifier
   * @returns {Object} Tracker status
   */
  getRoomStatus(roomId) {
    const tracker = this.getOrCreateTracker(roomId);
    return {
      messageCount: tracker.messageCount,
      maxMessages: tracker.maxMessages,
      isAsleep: tracker.isAsleep,
      sleepReason: tracker.sleepReason,
      lastResetTime: tracker.lastResetTime,
      lastAIMessageTime: tracker.lastAIMessageTime,
      canSendMessage: this.canAISendMessage(roomId)
    };
  }

  /**
   * Get all room statuses
   * @returns {Object} All room statuses
   */
  getAllRoomStatuses() {
    const statuses = {};
    for (const [roomId, tracker] of this.roomTrackers) {
      statuses[roomId] = this.getRoomStatus(roomId);
    }
    return statuses;
  }

  /**
   * Update max messages for a room
   * @param {string} roomId - Room identifier
   * @param {number} maxMessages - New max message count
   */
  updateMaxMessages(roomId, maxMessages) {
    const tracker = this.getOrCreateTracker(roomId);
    tracker.maxMessages = maxMessages;
    
    // If current count exceeds new limit, put to sleep
    if (tracker.messageCount >= maxMessages) {
      this.putAIsToSleep(roomId, 'max-messages-updated');
    }
  }

  /**
   * Reset tracker for room
   * @param {string} roomId - Room identifier
   */
  resetRoom(roomId) {
    this.wakeUpAIs(roomId, 'manual-reset');
  }

  /**
   * Remove tracker for room
   * @param {string} roomId - Room identifier
   */
  removeRoom(roomId) {
    this.roomTrackers.delete(roomId);
  }

  /**
   * Get statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    const totalRooms = this.roomTrackers.size;
    const sleepingRooms = Array.from(this.roomTrackers.values())
      .filter(tracker => tracker.isAsleep).length;
    const activeRooms = totalRooms - sleepingRooms;
    
    const totalMessages = Array.from(this.roomTrackers.values())
      .reduce((sum, tracker) => sum + tracker.messageCount, 0);

    return {
      totalRooms,
      activeRooms,
      sleepingRooms,
      totalAIMessages: totalMessages,
      avgMessagesPerRoom: totalRooms > 0 ? totalMessages / totalRooms : 0
    };
  }

  /**
   * Cleanup old room trackers
   * @param {number} maxAge - Max age in milliseconds
   */
  cleanup(maxAge = 24 * 60 * 60 * 1000) { // 24 hours default
    const now = Date.now();
    const toRemove = [];

    for (const [roomId, tracker] of this.roomTrackers) {
      if (now - tracker.lastResetTime > maxAge) {
        toRemove.push(roomId);
      }
    }

    toRemove.forEach(roomId => this.removeRoom(roomId));
    return toRemove.length;
  }
}
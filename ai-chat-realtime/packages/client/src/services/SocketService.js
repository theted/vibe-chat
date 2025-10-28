/**
 * Socket Service - Manages WebSocket connection and events
 */

import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.eventCallbacks = new Map(); // Internal event system for React components
  }

  connect(serverUrl = 'http://localhost:3001') {
    if (this.socket) {
      return this.socket;
    }

    this.socket = io(serverUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
    });

    this.setupDefaultListeners();
    return this.socket;
  }

  setupDefaultListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Connected to server:', this.socket.id);
      this.emitInternal('connection-status', { connected: true, socketId: this.socket.id });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason);
      this.emitInternal('connection-status', { connected: false, reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 Connection error:', error.message);
      console.error('Full error:', error);
      this.emitInternal('connection-error', error);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconnected after', attemptNumber, 'attempts');
      this.emitInternal('reconnected', attemptNumber);
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('🔄 Reconnection error:', error.message);
      this.emitInternal('reconnect-error', error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Reconnection failed - giving up');
      this.emitInternal('reconnect-failed');
    });
  }

  // Event management for React components
  on(event, callback) {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, new Set());
    }
    this.eventCallbacks.get(event).add(callback);

    // Also listen to server events
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.eventCallbacks.has(event)) {
      this.eventCallbacks.get(event).delete(callback);
    }

    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }

    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Emit to server
  emit(event, data) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  // Emit to React components (internal events)
  emitInternal(event, data) {
    if (this.eventCallbacks.has(event)) {
      this.eventCallbacks.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event callback for ${event}:`, error);
        }
      });
    }
  }

  // Chat specific methods
  joinRoom(username, roomId = 'default') {
    this.emit('join-room', { username, roomId });
  }

  sendMessage(content) {
    this.emit('user-message', { content });
  }

  changeTopic(topic) {
    this.emit('change-topic', { topic });
  }

  getRoomInfo() {
    this.emit('get-room-info');
  }

  getAIStatus() {
    this.emit('get-ai-status');
  }

  adminWakeAIs() {
    this.emit('admin-wake-ais');
  }

  adminSleepAIs() {
    this.emit('admin-sleep-ais');
  }

  triggerAI(aiNames, message, context = []) {
    this.emit('trigger-ai', { aiNames, message, context });
  }

  startTyping() {
    console.log('📝 Sending user-typing-start event');
    this.emit('user-typing-start');
  }

  stopTyping() {
    console.log('✋ Sending user-typing-stop event');
    this.emit('user-typing-stop');
  }

  // Connection management
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected() {
    return this.socket && this.socket.connected;
  }

  getSocketId() {
    return this.socket ? this.socket.id : null;
  }

  // Utility methods
  clearAllListeners() {
    this.listeners.clear();
    if (this.socket) {
      this.socket.removeAllListeners();
      this.setupDefaultListeners();
    }
  }

  reconnect() {
    if (this.socket) {
      this.socket.connect();
    }
  }
}

// Singleton instance
const socketService = new SocketService();
export default socketService;
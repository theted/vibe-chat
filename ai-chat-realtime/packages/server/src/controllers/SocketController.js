/**
 * Socket Controller - Handles WebSocket events and connections
 */

import { RoomManager } from '../managers/RoomManager.js';
import { AIMessageTracker } from '../managers/AIMessageTracker.js';

const RECENT_MESSAGE_LIMIT = 20;
const MESSAGE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

const normalizeAlias = (value) =>
  value ? value.toString().toLowerCase().replace(/[^a-z0-9]/g, '') : '';

export class SocketController {
  constructor(io, chatOrchestrator, metricsService, redisClient = null) {
    this.io = io;
    this.chatOrchestrator = chatOrchestrator;
    this.metricsService = metricsService;
    this.redisClient = redisClient;
    this.recentMessageLimit = RECENT_MESSAGE_LIMIT;
    this.previewRoomId = 'preview-default-room';
    this.roomManager = new RoomManager();
    this.aiTracker = new AIMessageTracker();
    this.connectedUsers = new Map(); // socketId -> user data

    this.setupChatOrchestratorEvents();
  }

  /**
   * Setup chat orchestrator event listeners
   */
  setupChatOrchestratorEvents() {
    this.chatOrchestrator.on('message-broadcast', async ({ message, roomId }) => {
      await this.handleBroadcastMessage(message, roomId);
    });

    this.chatOrchestrator.on('ais-sleeping', ({ reason }) => {
      this.io.emit('ai-status-changed', { status: 'sleeping', reason });
    });

    this.chatOrchestrator.on('ais-awakened', () => {
      this.io.emit('ai-status-changed', { status: 'active' });
    });

    this.chatOrchestrator.on('ai-generating-start', (payload) => {
      if (!payload?.roomId) return;
      this.io.to(payload.roomId).emit('ai-generating-start', payload);
    });

    this.chatOrchestrator.on('ai-generating-stop', (payload) => {
      if (!payload?.roomId) return;
      this.io.to(payload.roomId).emit('ai-generating-stop', payload);
    });

    this.chatOrchestrator.on('topic-changed', ({ newTopic, changedBy, roomId }) => {
      this.io.to(roomId).emit('topic-changed', { newTopic, changedBy });
    });

    this.chatOrchestrator.on('error', ({ message, error }) => {
      console.error('Chat orchestrator error:', error);
    });
  }

  async handleBroadcastMessage(message, roomId) {
    try {
      await this.storeMessage(roomId, message);
    } catch (error) {
      console.warn('Failed to persist message history:', error?.message || error);
    }

    this.io.to(roomId).emit('new-message', message);
    this.io.to(this.previewRoomId).emit('preview-message', {
      roomId,
      message,
      participants: this.roomManager.getRoomParticipants(roomId),
      aiParticipants: this.getActiveAIParticipants(),
    });

    // Track metrics based on message type
    if (message.senderType === 'ai') {
      this.metricsService.recordAIMessage(roomId, message.aiId || message.sender, message);
    }
  }

  /**
   * Handle new socket connection
   * @param {Object} socket - Socket.IO socket
   */
  handleConnection(socket) {
    console.log(`User connected: ${socket.id}`);

    // Set up event handlers
    this.setupSocketEvents(socket);
    socket.join(this.previewRoomId);

    // Send initial data
    socket.emit('connection-established', {
      socketId: socket.id,
      serverTime: Date.now(),
      availableRooms: this.roomManager.getRoomList()
    });

    this.sendRecentMessages(socket).catch((error) => {
      console.warn('Failed to send recent messages on connect:', error?.message || error);
    });
  }

  /**
   * Setup event handlers for a socket
   * @param {Object} socket - Socket.IO socket
   */
  setupSocketEvents(socket) {
    // User joins a room
    socket.on('join-room', (data) => {
      this.handleJoinRoom(socket, data);
    });

    // User sends a message
    socket.on('user-message', (data) => {
      this.handleUserMessage(socket, data);
    });

    // Change topic
    socket.on('change-topic', (data) => {
      this.handleTopicChange(socket, data);
    });

    // Typing indicators
    socket.on('user-typing-start', () => {
      this.handleUserTyping(socket, true);
    });

    socket.on('user-typing-stop', () => {
      this.handleUserTyping(socket, false);
    });

    // Get room info
    socket.on('get-room-info', (data) => {
      this.handleGetRoomInfo(socket, data);
    });

    // Get AI status
    socket.on('get-ai-status', () => {
      this.handleGetAIStatus(socket);
    });

    // Admin commands
    socket.on('admin-wake-ais', (data) => {
      this.handleAdminWakeAIs(socket, data);
    });

    socket.on('admin-sleep-ais', (data) => {
      this.handleAdminSleepAIs(socket, data);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      this.handleDisconnect(socket);
    });

    // Dashboard connection
    socket.on('join-dashboard', () => {
      socket.join('dashboard');
      // Send current metrics immediately
      const metrics = this.metricsService.getDetailedMetrics();
      socket.emit('metrics-update', metrics);
    });

    socket.on('get-metrics', () => {
      const metrics = this.metricsService.getDetailedMetrics();
      socket.emit('metrics-update', metrics);
    });

    socket.on('get-metrics-history', (data) => {
      const duration = data?.duration;
      const history = this.metricsService.getMetricsHistory(duration);
      socket.emit('metrics-history', history);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket ${socket.id} error:`, error);
    });
  }

  /**
   * Handle user joining a room
   * @param {Object} socket - Socket.IO socket
   * @param {Object} data - Join room data
   */
  handleJoinRoom(socket, data) {
    try {
      const { username, roomId = 'default' } = data;

      if (!username || username.trim().length === 0) {
        socket.emit('error', { message: 'Username is required' });
        return;
      }

      // Validate username
      if (username.length > 50 || !/^[a-zA-Z0-9_-]+$/.test(username)) {
        socket.emit('error', { 
          message: 'Username must be 1-50 characters, letters, numbers, dash, underscore only' 
        });
        return;
      }

      const userData = {
        username: username.trim(),
        joinedAt: Date.now()
      };

      // Join room
      const room = this.roomManager.joinRoom(socket.id, roomId, userData);
      
      if (!room) {
        socket.emit('error', { message: 'Failed to join room - room may be full' });
        return;
      }

      // Join Socket.IO room
      socket.join(roomId);
      
      // Store user data
      this.connectedUsers.set(socket.id, { ...userData, roomId });

      // Initialize AI tracker for room
      this.aiTracker.initializeRoom(roomId);

      // Update metrics
      this.metricsService.updateActiveUsers(this.connectedUsers.size);
      this.metricsService.updateActiveRooms(this.roomManager.getStats().totalRooms);

      // Notify user
      socket.emit('room-joined', {
        roomId,
        roomName: room.name,
        topic: room.topic,
        participants: this.roomManager.getRoomParticipants(roomId)
      });

      socket.leave(this.previewRoomId);
      this.sendRecentMessages(socket, roomId).catch((error) => {
        console.warn('Failed to send room history after join:', error?.message || error);
      });

      // Notify others in room
      socket.to(roomId).emit('user-joined', {
        username: userData.username,
        timestamp: Date.now()
      });

      console.log(`${userData.username} joined room ${roomId}`);

    } catch (error) {
      console.error('Error handling join room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  }

  /**
   * Handle user message
   * @param {Object} socket - Socket.IO socket
   * @param {Object} data - Message data
   */
  handleUserMessage(socket, data) {
    try {
      const user = this.connectedUsers.get(socket.id);
      if (!user) {
        socket.emit('error', { message: 'User not found - please rejoin' });
        return;
      }

      const { content } = data;
      if (!content || content.trim().length === 0) {
        socket.emit('error', { message: 'Message content is required' });
        return;
      }

      if (content.length > 1000) {
        socket.emit('error', { message: 'Message too long (max 1000 characters)' });
        return;
      }

      const message = {
        sender: user.username,
        content: content.trim(),
        senderType: 'user',
        roomId: user.roomId,
        priority: 1000 // High priority for user messages
      };

      // Track user message
      this.aiTracker.onUserMessage(user.roomId, user.username);
      this.metricsService.recordUserMessage(user.roomId, user.username, message);

      // Add message to chat orchestrator
      this.chatOrchestrator.addMessage(message);
      this.io.to(user.roomId).emit('user-typing-stop', {
        username: user.username,
        roomId: user.roomId
      });

      console.log(`Message from ${user.username} in ${user.roomId}: ${content.substring(0, 50)}...`);

    } catch (error) {
      console.error('Error handling user message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  /**
   * Handle user typing state updates
   * @param {Object} socket - Socket.IO socket
   * @param {boolean} isTyping - Whether the user is typing
   */
  handleUserTyping(socket, isTyping) {
    try {
      const user = this.connectedUsers.get(socket.id);
      if (!user) {
        return;
      }

      const payload = {
        username: user.username,
        roomId: user.roomId
      };

      const eventName = isTyping ? 'user-typing-start' : 'user-typing-stop';
      this.io.to(user.roomId).emit(eventName, payload);
    } catch (error) {
      console.error('Error handling user typing state:', error);
    }
  }

  /**
   * Handle topic change
   * @param {Object} socket - Socket.IO socket
   * @param {Object} data - Topic change data
   */
  handleTopicChange(socket, data) {
    try {
      const user = this.connectedUsers.get(socket.id);
      if (!user) {
        socket.emit('error', { message: 'User not found - please rejoin' });
        return;
      }

      const { topic } = data;
      if (!topic || topic.trim().length === 0) {
        socket.emit('error', { message: 'Topic is required' });
        return;
      }

      if (topic.length > 100) {
        socket.emit('error', { message: 'Topic too long (max 100 characters)' });
        return;
      }

      const newTopic = topic.trim();
      
      // Update room topic
      const updated = this.roomManager.updateRoomTopic(user.roomId, newTopic, user.username);
      
      if (!updated) {
        socket.emit('error', { message: 'Failed to update topic' });
        return;
      }

      // Notify chat orchestrator
      this.chatOrchestrator.changeTopic(newTopic, user.username, user.roomId);

      console.log(`${user.username} changed topic in ${user.roomId} to: ${newTopic}`);

    } catch (error) {
      console.error('Error handling topic change:', error);
      socket.emit('error', { message: 'Failed to change topic' });
    }
  }

  /**
   * Handle get room info request
   * @param {Object} socket - Socket.IO socket
   * @param {Object} data - Request data
   */
  handleGetRoomInfo(socket, data) {
    try {
      const user = this.connectedUsers.get(socket.id);
      if (!user) {
        socket.emit('error', { message: 'User not found - please rejoin' });
        return;
      }

      const room = this.roomManager.getRoom(user.roomId);
      const participants = this.roomManager.getRoomParticipants(user.roomId);
      const aiStatus = this.aiTracker.getRoomStatus(user.roomId);

      socket.emit('room-info', {
        room,
        participants,
        aiStatus
      });

    } catch (error) {
      console.error('Error getting room info:', error);
      socket.emit('error', { message: 'Failed to get room info' });
    }
  }

  /**
   * Handle get AI status request
   * @param {Object} socket - Socket.IO socket
   */
  handleGetAIStatus(socket) {
    try {
      const orchestratorStatus = this.chatOrchestrator.getStatus();
      const trackerStats = this.aiTracker.getStats();

      socket.emit('ai-status', {
        orchestrator: orchestratorStatus,
        tracker: trackerStats
      });

    } catch (error) {
      console.error('Error getting AI status:', error);
      socket.emit('error', { message: 'Failed to get AI status' });
    }
  }

  getRoomMessageKey(roomId = 'default') {
    return `ai-chat:rooms:${roomId}:messages`;
  }

  async storeMessage(roomId = 'default', message) {
    if (!this.redisClient) return;

    const key = this.getRoomMessageKey(roomId);
    const storedMessage = {
      ...message,
      roomId,
      timestamp: message.timestamp || Date.now(),
      storedAt: Date.now(),
    };

    try {
      await this.redisClient
        .multi()
        .lPush(key, JSON.stringify(storedMessage))
        .lTrim(key, 0, this.recentMessageLimit - 1)
        .expire(key, MESSAGE_TTL_SECONDS)
        .exec();
    } catch (error) {
      console.warn('Failed to store message in Redis:', error?.message || error);
    }
  }

  async getRecentMessages(roomId = 'default') {
    if (!this.redisClient) {
      // Fallback to in-memory context
      return this.chatOrchestrator
        .contextManager
        .getContextForAI(this.recentMessageLimit)
        .map((ctx) => ({
          id: ctx.id || `ctx-${ctx.timestamp || Date.now()}-${Math.random().toString(16).slice(2)}`,
          sender: ctx.sender,
          displayName: ctx.displayName || ctx.sender,
          alias: ctx.alias,
          normalizedAlias: ctx.normalizedAlias,
          content: ctx.content,
          senderType: ctx.senderType,
          timestamp: ctx.timestamp || Date.now(),
          roomId,
        }));
    }

    const key = this.getRoomMessageKey(roomId);
    try {
      const entries = await this.redisClient.lRange(key, 0, this.recentMessageLimit - 1);
      return entries
        .map((entry) => {
          try {
            const parsed = JSON.parse(entry);
            return {
              ...parsed,
              timestamp: parsed.timestamp || parsed.storedAt || Date.now(),
              roomId: parsed.roomId || roomId,
            };
          } catch (error) {
            return null;
          }
        })
        .filter(Boolean)
        .reverse();
    } catch (error) {
      console.warn('Failed to load recent messages from Redis:', error?.message || error);
      return [];
    }
  }

  getActiveAIParticipants() {
    return Array.from(this.chatOrchestrator.aiServices.values()).map((ai) => ({
      id: ai.id,
      name: ai.displayName || ai.name,
      displayName: ai.displayName || ai.name,
      alias: ai.alias,
      normalizedAlias: ai.normalizedAlias,
      emoji: ai.emoji,
      provider: ai.config?.providerKey?.toUpperCase?.() || ai.name,
      status: ai.isActive ? 'active' : 'inactive'
    }));
  }

  async sendRecentMessages(socket, roomId = 'default') {
    try {
      const [messages, participants, aiParticipants] = await Promise.all([
        this.getRecentMessages(roomId),
        Promise.resolve(this.roomManager.getRoomParticipants(roomId)),
        Promise.resolve(this.getActiveAIParticipants()),
      ]);

      socket.emit('recent-messages', {
        roomId,
        messages,
        participants,
        aiParticipants,
      });
    } catch (error) {
      console.warn('Failed to send recent messages:', error?.message || error);
    }
  }

  /**
   * Handle admin wake AIs command
   * @param {Object} socket - Socket.IO socket
   * @param {Object} data - Command data
   */
  handleAdminWakeAIs(socket, data) {
    try {
      const user = this.connectedUsers.get(socket.id);
      if (!user) {
        return;
      }

      this.aiTracker.wakeUpAIs(user.roomId, `admin-wake-by-${user.username}`);
      this.chatOrchestrator.wakeUpAIs();

      socket.to(user.roomId).emit('admin-action', {
        action: 'wake-ais',
        by: user.username
      });

    } catch (error) {
      console.error('Error waking AIs:', error);
    }
  }

  /**
   * Handle admin sleep AIs command
   * @param {Object} socket - Socket.IO socket
   * @param {Object} data - Command data
   */
  handleAdminSleepAIs(socket, data) {
    try {
      const user = this.connectedUsers.get(socket.id);
      if (!user) {
        return;
      }

      this.aiTracker.putAIsToSleep(user.roomId, `admin-sleep-by-${user.username}`);
      this.chatOrchestrator.putAIsToSleep();

      socket.to(user.roomId).emit('admin-action', {
        action: 'sleep-ais',
        by: user.username
      });

    } catch (error) {
      console.error('Error sleeping AIs:', error);
    }
  }

  /**
   * Handle user disconnect
   * @param {Object} socket - Socket.IO socket
   */
  handleDisconnect(socket) {
    try {
      const user = this.connectedUsers.get(socket.id);
      
      if (user) {
        // Notify others in room
        socket.to(user.roomId).emit('user-left', {
          username: user.username,
          timestamp: Date.now()
        });
        this.io.to(user.roomId).emit('user-typing-stop', {
          username: user.username,
          roomId: user.roomId
        });

        console.log(`${user.username} disconnected from room ${user.roomId}`);
      }

      // Cleanup
      this.roomManager.cleanup(socket.id);
      this.connectedUsers.delete(socket.id);

      // Update metrics
      this.metricsService.updateActiveUsers(this.connectedUsers.size);
      this.metricsService.updateActiveRooms(this.roomManager.getStats().totalRooms);

    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  }

  /**
   * Get server statistics
   * @returns {Object} Server statistics
   */
  getStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      rooms: this.roomManager.getStats(),
      aiTracker: this.aiTracker.getStats(),
      orchestrator: this.chatOrchestrator.getStatus()
    };
  }
}

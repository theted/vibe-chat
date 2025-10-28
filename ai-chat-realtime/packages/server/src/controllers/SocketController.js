/**
 * Socket Controller - Handles WebSocket events and connections
 */

import { RoomManager } from '../managers/RoomManager.js';
import { AIMessageTracker } from '../managers/AIMessageTracker.js';

export class SocketController {
  constructor(io, chatOrchestrator) {
    this.io = io;
    this.chatOrchestrator = chatOrchestrator;
    this.roomManager = new RoomManager();
    this.aiTracker = new AIMessageTracker();
    this.connectedUsers = new Map(); // socketId -> user data

    this.setupChatOrchestratorEvents();
  }

  /**
   * Setup chat orchestrator event listeners
   */
  setupChatOrchestratorEvents() {
    this.chatOrchestrator.on('message-broadcast', ({ message, roomId }) => {
      this.io.to(roomId).emit('new-message', message);
    });

    this.chatOrchestrator.on('ais-sleeping', ({ reason }) => {
      this.io.emit('ai-status-changed', { status: 'sleeping', reason });
    });

    this.chatOrchestrator.on('ais-awakened', () => {
      this.io.emit('ai-status-changed', { status: 'active' });
    });

    this.chatOrchestrator.on('topic-changed', ({ newTopic, changedBy, roomId }) => {
      this.io.to(roomId).emit('topic-changed', { newTopic, changedBy });
    });

    this.chatOrchestrator.on('error', ({ message, error }) => {
      console.error('Chat orchestrator error:', error);
    });
  }

  /**
   * Handle new socket connection
   * @param {Object} socket - Socket.IO socket
   */
  handleConnection(socket) {
    console.log(`User connected: ${socket.id}`);

    // Set up event handlers
    this.setupSocketEvents(socket);

    // Send initial data
    socket.emit('connection-established', {
      socketId: socket.id,
      serverTime: Date.now(),
      availableRooms: this.roomManager.getRoomList()
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

      // Notify user
      socket.emit('room-joined', {
        roomId,
        roomName: room.name,
        topic: room.topic,
        participants: this.roomManager.getRoomParticipants(roomId)
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

      // Add message to chat orchestrator
      this.chatOrchestrator.addMessage(message);

      console.log(`Message from ${user.username} in ${user.roomId}: ${content.substring(0, 50)}...`);

    } catch (error) {
      console.error('Error handling user message:', error);
      socket.emit('error', { message: 'Failed to send message' });
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

        console.log(`${user.username} disconnected from room ${user.roomId}`);
      }

      // Cleanup
      this.roomManager.cleanup(socket.id);
      this.connectedUsers.delete(socket.id);

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
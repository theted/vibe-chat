import type { Server, Socket } from "socket.io";
import type { ChatOrchestrator } from "@ai-chat/core";

import { RoomManager } from "@/managers/RoomManager.js";
import { AIMessageTracker } from "@/managers/AIMessageTracker.js";
import { RateLimiter } from "@/services/RateLimiter.js";
import { MessageHistoryService } from "@/services/MessageHistoryService.js";
import type { ChatAssistantService } from "@/services/ChatAssistantService.js";
import type { MetricsService } from "@/services/MetricsService.js";
import type { RedisClient } from "@/services/RedisClient.js";
import { getClientIp } from "@/utils/httpUtils.js";
import { transformAIServicesToParticipants } from "@/utils/aiServiceUtils.js";
import {
  USER_MESSAGE_LIMIT,
  USER_MESSAGE_WINDOW_MS,
  USERNAME_MAX_LENGTH,
  MESSAGE_MAX_LENGTH,
  TOPIC_MAX_LENGTH,
} from "@/config/serverConfig.js";
import type {
  ActiveAIParticipant,
  ChatAssistantMetadata,
  ChatAssistantOrigin,
  ChatMessage,
  ConnectedUser,
  JoinRoomPayload,
  MetricsHistoryPayload,
  TopicChangePayload,
  TriggerChatAssistantPayload,
  UserMessagePayload,
} from "@/types.js";

const PRIVATE_ROOM_PREFIX = "private:";

const getPrivateRoomAiId = (roomId: string): string | null => {
  if (!roomId.startsWith(PRIVATE_ROOM_PREFIX)) {
    return null;
  }

  const parts = roomId.split(":");
  if (parts.length < 3) {
    return null;
  }

  const aiId = parts.slice(2).join(":").trim();
  return aiId || null;
};

const normalizeRoomAiToken = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Handles Socket.IO events and chat state for each room.
 */
export class SocketController {
  private io: Server;
  private chatOrchestrator: ChatOrchestrator;
  private metricsService: MetricsService;
  private messageHistory: MessageHistoryService;
  private previewRoomId: string;
  roomManager: RoomManager;
  private aiTracker: AIMessageTracker;
  private connectedUsers: Map<string, ConnectedUser>;
  chatAssistantService: ChatAssistantService | null;
  chatAssistantMetadata: ChatAssistantMetadata | null;
  private rateLimiter: RateLimiter;

  /**
   * Create a SocketController for handling real-time chat events.
   * @param io - Socket.IO server instance.
   * @param chatOrchestrator - Chat orchestrator for AI responses.
   * @param metricsService - Metrics service for tracking usage.
   * @param redisClient - Optional Redis client for history persistence.
   * @param options - Optional chat assistant configuration.
   */
  constructor(
    io: Server,
    chatOrchestrator: ChatOrchestrator,
    metricsService: MetricsService,
    redisClient: RedisClient | null = null,
    options: { chatAssistantService?: ChatAssistantService | null } = {},
  ) {
    this.io = io;
    this.chatOrchestrator = chatOrchestrator;
    this.metricsService = metricsService;
    this.messageHistory = new MessageHistoryService({ redisClient });
    this.previewRoomId = "preview-default-room";
    this.roomManager = new RoomManager();
    this.aiTracker = new AIMessageTracker();
    this.connectedUsers = new Map(); // socketId -> user data
    this.chatAssistantService = options.chatAssistantService || null;
    this.chatAssistantMetadata = this.chatAssistantService
      ? this.chatAssistantService.getMetadata()
      : null;
    this.rateLimiter = new RateLimiter({
      redisClient,
      windowMs: USER_MESSAGE_WINDOW_MS,
      maxMessages: USER_MESSAGE_LIMIT,
      keyPrefix: "rate-limiter:ip:",
    });

    this.setupChatOrchestratorEvents();
  }

  /**
   * Setup chat orchestrator event listeners
   */
  setupChatOrchestratorEvents(): void {
    this.chatOrchestrator.on(
      "message-broadcast",
      async ({ message, roomId }: { message: ChatMessage; roomId: string }) => {
        await this.handleBroadcastMessage(message, roomId);
      },
    );

    this.chatOrchestrator.on(
      "ais-sleeping",
      ({ reason }: { reason?: string }) => {
        this.io.emit("ai-status-changed", { status: "sleeping", reason });
      },
    );

    this.chatOrchestrator.on("ais-awakened", () => {
      this.io.emit("ai-status-changed", { status: "active" });
    });

    this.chatOrchestrator.on(
      "ai-generating-start",
      (payload: { roomId?: string }) => {
        if (!payload?.roomId) return;
        this.io.to(payload.roomId).emit("ai-generating-start", payload);
      },
    );

    this.chatOrchestrator.on(
      "ai-generating-stop",
      (payload: { roomId?: string }) => {
        if (!payload?.roomId) return;
        this.io.to(payload.roomId).emit("ai-generating-stop", payload);
      },
    );

    this.chatOrchestrator.on(
      "ai-response",
      (payload: {
        providerKey?: string;
        modelKey?: string;
        responseTimeMs?: number;
      }) => {
        this.metricsService.recordAIResponse(payload);
      },
    );

    this.chatOrchestrator.on(
      "ai-error",
      (payload: {
        providerKey?: string;
        modelKey?: string;
        responseTimeMs?: number;
        error?: Error;
      }) => {
        const errorMessage =
          payload.error instanceof Error ? payload.error.message : undefined;
        this.metricsService.recordAIError({
          providerKey: payload.providerKey,
          modelKey: payload.modelKey,
          responseTimeMs: payload.responseTimeMs,
          errorMessage,
        });
      },
    );

    this.chatOrchestrator.on(
      "topic-changed",
      ({
        newTopic,
        changedBy,
        roomId,
      }: {
        newTopic: string;
        changedBy: string;
        roomId: string;
      }) => {
        this.io.to(roomId).emit("topic-changed", { newTopic, changedBy });
      },
    );

    this.chatOrchestrator.on("error", ({ error }: { error: Error }) => {
      console.error("Chat orchestrator error:", error);
    });
  }

  async handleBroadcastMessage(
    message: ChatMessage,
    roomId: string,
  ): Promise<void> {
    try {
      await this.messageHistory.storeMessage(roomId, message);
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : String(error);
      console.warn("Failed to persist message history:", messageText);
    }

    this.io.to(roomId).emit("new-message", message);
    this.io.to(this.previewRoomId).emit("preview-message", {
      roomId,
      message,
      participants: this.roomManager.getRoomParticipants(roomId),
      aiParticipants: this.getActiveAIParticipants(),
    });

    // Track metrics based on message type
    if (message.senderType === "ai") {
      this.metricsService.recordAIMessage(
        roomId,
        message.aiId || message.sender,
        message,
      );
    }

    if (
      message.senderType === "ai" &&
      this.chatAssistantService &&
      !message.isInternalResponder
    ) {
      await this.triggerChatAssistant({
        roomId,
        content: message.content,
        origin: {
          type: "ai",
          sender: message.sender,
          aiId: message.aiId,
          isInternalResponder: message.isInternalResponder,
        },
      });
    }
  }

  /**
   * Handle new socket connection
   * @param {Object} socket - Socket.IO socket
   */
  handleConnection(socket: Socket): void {
    console.log(`User connected: ${socket.id}`);

    // Set up event handlers
    this.setupSocketEvents(socket);
    socket.join(this.previewRoomId);

    // Send initial data
    socket.emit("connection-established", {
      socketId: socket.id,
      serverTime: Date.now(),
      availableRooms: this.roomManager.getRoomList(),
    });

    this.sendRecentMessages(socket).catch((error) => {
      const messageText =
        error instanceof Error ? error.message : String(error);
      console.warn("Failed to send recent messages on connect:", messageText);
    });
  }

  /**
   * Setup event handlers for a socket
   * @param {Object} socket - Socket.IO socket
   */
  setupSocketEvents(socket: Socket): void {
    // User joins a room
    socket.on("join-room", (data: JoinRoomPayload) => {
      this.handleJoinRoom(socket, data);
    });

    // User sends a message
    socket.on("user-message", (data: UserMessagePayload) => {
      this.handleUserMessage(socket, data);
    });

    // Change topic
    socket.on("change-topic", (data: TopicChangePayload) => {
      this.handleTopicChange(socket, data);
    });

    // Typing indicators
    socket.on("user-typing-start", () => {
      this.handleUserTyping(socket, true);
    });

    socket.on("user-typing-stop", () => {
      this.handleUserTyping(socket, false);
    });

    // Get room info
    socket.on("get-room-info", (data: unknown) => {
      this.handleGetRoomInfo(socket, data);
    });

    // Get AI status
    socket.on("get-ai-status", () => {
      this.handleGetAIStatus(socket);
    });

    // Admin commands
    socket.on("admin-wake-ais", (data: unknown) => {
      this.handleAdminWakeAIs(socket, data);
    });

    socket.on("admin-sleep-ais", (data: unknown) => {
      this.handleAdminSleepAIs(socket, data);
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      this.handleDisconnect(socket);
    });

    // Dashboard connection
    socket.on("join-dashboard", () => {
      socket.join("dashboard");
      // Send current metrics immediately
      const metrics = this.metricsService.getDetailedMetrics();
      socket.emit("metrics-update", metrics);
      socket.emit("ai-participants", this.getActiveAIParticipants());
    });

    socket.on("get-metrics", () => {
      const metrics = this.metricsService.getDetailedMetrics();
      socket.emit("metrics-update", metrics);
    });

    socket.on("get-ai-participants", () => {
      socket.emit("ai-participants", this.getActiveAIParticipants());
    });

    socket.on("get-metrics-history", (data: MetricsHistoryPayload) => {
      const duration = data?.duration;
      const history = this.metricsService.getMetricsHistory(duration);
      socket.emit("metrics-history", history);
    });

    // Handle errors
    socket.on("error", (error: Error) => {
      console.error(`Socket ${socket.id} error:`, error);
    });
  }

  /**
   * Handle user joining a room
   * @param {Object} socket - Socket.IO socket
   * @param {Object} data - Join room data
   */
  handleJoinRoom(socket: Socket, data: JoinRoomPayload): void {
    try {
      const { username, roomId = "default" } = data;

      if (!username || username.trim().length === 0) {
        socket.emit("error", { message: "Username is required" });
        return;
      }

      // Validate username
      if (username.length > USERNAME_MAX_LENGTH || !/^[a-zA-Z0-9_-]+$/.test(username)) {
        socket.emit("error", {
          message:
            `Username must be 1-${USERNAME_MAX_LENGTH} characters, letters, numbers, dash, underscore only`,
        });
        return;
      }

      const userData = {
        username: username.trim(),
        joinedAt: Date.now(),
      };

      // Join room
      const room = this.roomManager.joinRoom(socket.id, roomId, userData);

      if (!room) {
        socket.emit("error", {
          message: "Failed to join room - room may be full",
        });
        return;
      }

      // Join Socket.IO room
      socket.join(roomId);

      const privateAiId = getPrivateRoomAiId(roomId);
      if (privateAiId) {
        const directMatch = this.chatOrchestrator.aiServices.has(privateAiId)
          ? privateAiId
          : null;
        const normalizedMatch = directMatch
          ? null
          : this.chatOrchestrator.findAIByNormalizedAlias(
              normalizeRoomAiToken(privateAiId),
            );
        const resolvedAiId = directMatch || normalizedMatch?.id || null;

        if (resolvedAiId) {
          this.chatOrchestrator.setRoomAllowedAIs(roomId, [resolvedAiId]);
        } else {
          this.chatOrchestrator.clearRoomAllowedAIs(roomId);
        }
      } else {
        this.chatOrchestrator.clearRoomAllowedAIs(roomId);
      }

      // Store user data
      this.connectedUsers.set(socket.id, { ...userData, roomId });

      // Initialize AI tracker for room
      this.aiTracker.initializeRoom(roomId);

      // Update metrics
      this.metricsService.updateActiveUsers(this.connectedUsers.size);
      this.metricsService.updateActiveRooms(
        this.roomManager.getStats().totalRooms,
      );

      // Notify user
      socket.emit("room-joined", {
        roomId,
        roomName: room.name,
        topic: room.topic,
        participants: this.roomManager.getRoomParticipants(roomId),
        aiParticipants: this.getActiveAIParticipants(),
      });

      socket.leave(this.previewRoomId);
      this.sendRecentMessages(socket, roomId).catch((error) => {
        const messageText =
          error instanceof Error ? error.message : String(error);
        console.warn("Failed to send room history after join:", messageText);
      });

      // Notify others in room
      socket.to(roomId).emit("user-joined", {
        username: userData.username,
        timestamp: Date.now(),
      });

      console.log(`${userData.username} joined room ${roomId}`);
    } catch (error) {
      console.error("Error handling join room:", error);
      socket.emit("error", { message: "Failed to join room" });
    }
  }

  /**
   * Handle user message
   * @param {Object} socket - Socket.IO socket
   * @param {Object} data - Message data
   */
  async handleUserMessage(
    socket: Socket,
    data: UserMessagePayload,
  ): Promise<void> {
    try {
      const user = this.connectedUsers.get(socket.id);
      if (!user) {
        socket.emit("error", { message: "User not found - please rejoin" });
        return;
      }

      const { content } = data;
      if (!content || content.trim().length === 0) {
        socket.emit("error", { message: "Message content is required" });
        return;
      }

      if (content.length > MESSAGE_MAX_LENGTH) {
        socket.emit("error", {
          message: `Message too long (max ${MESSAGE_MAX_LENGTH} characters)`,
        });
        return;
      }

      const ipAddress = getClientIp(socket);
      const rateLimitResult = await this.rateLimiter.check(ipAddress);

      if (!rateLimitResult.allowed) {
        const retryAfterSeconds = rateLimitResult.retryAfterMs
          ? Math.ceil(rateLimitResult.retryAfterMs / 1000)
          : undefined;
        socket.emit("error", {
          message:
            "Rate limit exceeded: max 10 messages per 10 minutes. Please wait before sending more.",
          code: "RATE_LIMITED",
          retryAfterSeconds,
        });
        console.warn(
          `Rate limit exceeded for IP ${ipAddress || "unknown"} (user: ${user.username})`,
        );
        return;
      }

      const message: ChatMessage = {
        sender: user.username,
        content: content.trim(),
        senderType: "user",
        roomId: user.roomId,
        priority: 1000, // High priority for user messages
        suppressAIResponses: false,
      };

      const isChatAssistantQuery =
        !!this.chatAssistantService &&
        this.chatAssistantService.shouldHandle(message);

      if (isChatAssistantQuery) {
        message.suppressAIResponses = true;
      }

      // Track user message
      this.aiTracker.onUserMessage(user.roomId, user.username);
      this.metricsService.recordUserMessage(
        user.roomId,
        user.username,
        message,
      );
      if (isChatAssistantQuery) {
        console.info(
          `[ChatAssistant] User "${user.username}" mentioned @${this.chatAssistantService.name} with question:`,
          message.content,
        );
      }
      // Add message to chat orchestrator
      this.chatOrchestrator.addMessage(message);
      this.io.to(user.roomId).emit("user-typing-stop", {
        username: user.username,
        roomId: user.roomId,
      });

      console.log(
        `Message from ${user.username} in ${user.roomId}: ${content.substring(0, 50)}...`,
      );

      if (isChatAssistantQuery) {
        await this.triggerChatAssistant({
          roomId: user.roomId,
          content: message.content,
          origin: { type: "user", username: user.username },
        });
      }
    } catch (error) {
      console.error("Error handling user message:", error);
      socket.emit("error", { message: "Failed to send message" });
    }
  }

  /**
   * Handle user typing state updates
   * @param {Object} socket - Socket.IO socket
   * @param {boolean} isTyping - Whether the user is typing
   */
  handleUserTyping(socket: Socket, isTyping: boolean): void {
    try {
      const user = this.connectedUsers.get(socket.id);
      if (!user) {
        return;
      }

      const payload = {
        username: user.username,
        roomId: user.roomId,
      };

      const eventName = isTyping ? "user-typing-start" : "user-typing-stop";
      this.io.to(user.roomId).emit(eventName, payload);
    } catch (error) {
      console.error("Error handling user typing state:", error);
    }
  }

  /**
   * Handle topic change
   * @param {Object} socket - Socket.IO socket
   * @param {Object} data - Topic change data
   */
  handleTopicChange(socket: Socket, data: TopicChangePayload): void {
    try {
      const user = this.connectedUsers.get(socket.id);
      if (!user) {
        socket.emit("error", { message: "User not found - please rejoin" });
        return;
      }

      const { topic } = data;
      if (!topic || topic.trim().length === 0) {
        socket.emit("error", { message: "Topic is required" });
        return;
      }

      if (topic.length > TOPIC_MAX_LENGTH) {
        socket.emit("error", {
          message: `Topic too long (max ${TOPIC_MAX_LENGTH} characters)`,
        });
        return;
      }

      const newTopic = topic.trim();

      // Update room topic
      const updated = this.roomManager.updateRoomTopic(
        user.roomId,
        newTopic,
        user.username,
      );

      if (!updated) {
        socket.emit("error", { message: "Failed to update topic" });
        return;
      }

      // Notify chat orchestrator
      this.chatOrchestrator.changeTopic(newTopic, user.username, user.roomId);

      console.log(
        `${user.username} changed topic in ${user.roomId} to: ${newTopic}`,
      );
    } catch (error) {
      console.error("Error handling topic change:", error);
      socket.emit("error", { message: "Failed to change topic" });
    }
  }

  /**
   * Handle get room info request
   * @param {Object} socket - Socket.IO socket
   * @param {Object} data - Request data
   */
  handleGetRoomInfo(socket: Socket, data: unknown): void {
    try {
      const user = this.connectedUsers.get(socket.id);
      if (!user) {
        socket.emit("error", { message: "User not found - please rejoin" });
        return;
      }

      const room = this.roomManager.getRoom(user.roomId);
      const participants = this.roomManager.getRoomParticipants(user.roomId);
      const aiStatus = this.aiTracker.getRoomStatus(user.roomId);

      socket.emit("room-info", {
        room,
        participants,
        aiStatus,
        aiParticipants: this.getActiveAIParticipants(),
      });
    } catch (error) {
      console.error("Error getting room info:", error);
      socket.emit("error", { message: "Failed to get room info" });
    }
  }

  /**
   * Handle get AI status request
   * @param {Object} socket - Socket.IO socket
   */
  handleGetAIStatus(socket: Socket): void {
    try {
      const orchestratorStatus = this.chatOrchestrator.getStatus();
      const trackerStats = this.aiTracker.getStats();

      socket.emit("ai-status", {
        orchestrator: orchestratorStatus,
        tracker: trackerStats,
      });
    } catch (error) {
      console.error("Error getting AI status:", error);
      socket.emit("error", { message: "Failed to get AI status" });
    }
  }

  getActiveAIParticipants(): ActiveAIParticipant[] {
    return transformAIServicesToParticipants(this.chatOrchestrator.aiServices);
  }

  async getRecentMessages(roomId = "default"): Promise<ChatMessage[]> {
    return this.messageHistory.getRecentMessages(
      roomId,
      this.chatOrchestrator.contextManager
    );
  }

  async sendRecentMessages(socket: Socket, roomId = "default"): Promise<void> {
    try {
      const [messages, participants, aiParticipants] = await Promise.all([
        this.getRecentMessages(roomId),
        Promise.resolve(this.roomManager.getRoomParticipants(roomId)),
        Promise.resolve(this.getActiveAIParticipants()),
      ]);

      socket.emit("recent-messages", {
        roomId,
        messages,
        participants,
        aiParticipants,
      });
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : String(error);
      console.warn("Failed to send recent messages:", messageText);
    }
  }

  /**
   * Handle admin wake AIs command
   * @param {Object} socket - Socket.IO socket
   * @param {Object} data - Command data
   */
  handleAdminWakeAIs(socket: Socket, data: unknown): void {
    try {
      const user = this.connectedUsers.get(socket.id);
      if (!user) {
        return;
      }

      this.aiTracker.wakeUpAIs(user.roomId, `admin-wake-by-${user.username}`);
      this.chatOrchestrator.wakeUpAIs();

      socket.to(user.roomId).emit("admin-action", {
        action: "wake-ais",
        by: user.username,
      });
    } catch (error) {
      console.error("Error waking AIs:", error);
    }
  }

  /**
   * Handle admin sleep AIs command
   * @param {Object} socket - Socket.IO socket
   * @param {Object} data - Command data
   */
  handleAdminSleepAIs(socket: Socket, data: unknown): void {
    try {
      const user = this.connectedUsers.get(socket.id);
      if (!user) {
        return;
      }

      this.aiTracker.putAIsToSleep(
        user.roomId,
        `admin-sleep-by-${user.username}`,
      );
      this.chatOrchestrator.putAIsToSleep();

      socket.to(user.roomId).emit("admin-action", {
        action: "sleep-ais",
        by: user.username,
      });
    } catch (error) {
      console.error("Error sleeping AIs:", error);
    }
  }

  /**
   * Handle user disconnect
   * @param {Object} socket - Socket.IO socket
   */
  handleDisconnect(socket: Socket): void {
    try {
      const user = this.connectedUsers.get(socket.id);

      if (user) {
        // Notify others in room
        socket.to(user.roomId).emit("user-left", {
          username: user.username,
          timestamp: Date.now(),
        });
        this.io.to(user.roomId).emit("user-typing-stop", {
          username: user.username,
          roomId: user.roomId,
        });

        console.log(`${user.username} disconnected from room ${user.roomId}`);
      }

      // Cleanup
      this.roomManager.cleanup(socket.id);
      this.connectedUsers.delete(socket.id);

      // Update metrics
      this.metricsService.updateActiveUsers(this.connectedUsers.size);
      this.metricsService.updateActiveRooms(
        this.roomManager.getStats().totalRooms,
      );
    } catch (error) {
      console.error("Error handling disconnect:", error);
    }
  }

  /**
   * Get server statistics
   * @returns {Object} Server statistics
   */
  getStats(): {
    connectedUsers: number;
    rooms: ReturnType<RoomManager["getStats"]>;
    aiTracker: ReturnType<AIMessageTracker["getStats"]>;
    orchestrator: ReturnType<ChatOrchestrator["getStatus"]>;
  } {
    return {
      connectedUsers: this.connectedUsers.size,
      rooms: this.roomManager.getStats(),
      aiTracker: this.aiTracker.getStats(),
      orchestrator: this.chatOrchestrator.getStatus(),
    };
  }

  async triggerChatAssistant({
    roomId,
    content,
    origin = {},
  }: TriggerChatAssistantPayload): Promise<void> {
    if (!this.chatAssistantService || !this.chatAssistantMetadata || !content) {
      return;
    }

    if (!this.chatAssistantService.shouldHandle({ content })) {
      return;
    }

    if (origin.type === "ai") {
      if (origin.isInternalResponder) {
        return;
      }
      const assistantId = this.chatAssistantMetadata?.aiId;
      const assistantName = this.chatAssistantMetadata?.displayName;
      if (assistantId && origin.aiId && origin.aiId === assistantId) {
        return;
      }
      if (assistantName && origin.sender && origin.sender === assistantName) {
        return;
      }
    }

    try {
      const recentMessages = await this.getRecentMessages(roomId);
      const historyLimit = this.chatAssistantService?.chatHistoryLimit || 5;
      const chatHistory = Array.isArray(recentMessages)
        ? recentMessages.slice(-historyLimit)
        : [];

      const result = await this.chatAssistantService.createResponseFromContent(
        content,
        {
          emitter: this.io,
          roomId,
          chatHistory,
        },
      );
      if (!result || !result.answer) {
        return;
      }

      if (result.error) {
        console.warn(
          "Chat assistant encountered an issue:",
          result.error?.message || result.error,
        );
      }

      const messageId = `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const message: ChatMessage = {
        ...this.chatAssistantMetadata,
        content: result.answer,
        senderType: "ai",
        roomId,
        priority: 800,
        isInternalResponder: true,
        suppressAIResponses: true,
        mentionsTriggerSender:
          origin.type === "user" ? origin.username : origin.sender || null,
        contextQuestion: result.question,
        timestamp: Date.now(),
        id: messageId,
      };

      const originLabel =
        origin.type === "user"
          ? `user "${origin.username}"`
          : origin.sender
            ? `AI "${origin.sender}"`
            : "trigger";

      console.info(
        `[ChatAssistant] Dispatching answer for ${originLabel} (question: "${result.question}")`,
      );

      await this.chatOrchestrator.handleMessage(message);
    } catch (error) {
      console.error(
        "Failed to dispatch chat assistant response:",
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}

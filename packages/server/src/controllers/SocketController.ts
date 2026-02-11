import type { Server, Socket } from "socket.io";
import type { ChatOrchestrator } from "@ai-chat/core";

import { RoomManager } from "@/managers/RoomManager.js";
import { AIMessageTracker } from "@/managers/AIMessageTracker.js";
import { RateLimiter } from "@/services/RateLimiter.js";
import { MessageHistoryService } from "@/services/MessageHistoryService.js";
import type { ChatAssistantService } from "@/services/ChatAssistantService.js";
import type { MetricsService } from "@/services/MetricsService.js";
import type { RedisClient } from "@/services/RedisClient.js";
import { ChatAssistantHandler } from "./ChatAssistantHandler.js";
import { setupOrchestratorEventBridge } from "./OrchestratorEventBridge.js";
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
  ChatMessage,
  ConnectedUser,
  JoinRoomPayload,
  MetricsHistoryPayload,
  TopicChangePayload,
  UserMessagePayload,
} from "@/types.js";

const PRIVATE_ROOM_PREFIX = "private:";

const getPrivateRoomAiId = (roomId: string): string | null => {
  if (!roomId.startsWith(PRIVATE_ROOM_PREFIX)) return null;
  const parts = roomId.split(":");
  if (parts.length < 3) return null;
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
  private chatAssistant: ChatAssistantHandler;
  private rateLimiter: RateLimiter;

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
    this.connectedUsers = new Map();
    this.rateLimiter = new RateLimiter({
      redisClient,
      windowMs: USER_MESSAGE_WINDOW_MS,
      maxMessages: USER_MESSAGE_LIMIT,
      keyPrefix: "rate-limiter:ip:",
    });

    this.chatAssistant = new ChatAssistantHandler({
      chatAssistantService: options.chatAssistantService || null,
      chatOrchestrator,
      io,
      getRecentMessages: (roomId) => this.getRecentMessages(roomId),
    });

    setupOrchestratorEventBridge({
      chatOrchestrator,
      io,
      metricsService,
      onBroadcast: (message, roomId) =>
        this.handleBroadcastMessage(message, roomId),
    });
  }

  // Backward-compatible accessors used by tests / server setup
  get chatAssistantService(): ChatAssistantService | null {
    return this.chatAssistant.service;
  }

  get chatAssistantMetadata() {
    return this.chatAssistant.metadata;
  }

  // --- Broadcast ---

  async handleBroadcastMessage(message: ChatMessage, roomId: string): Promise<void> {
    try {
      await this.messageHistory.storeMessage(roomId, message);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn("Failed to persist message history:", msg);
    }

    this.io.to(roomId).emit("new-message", message);
    this.io.to(this.previewRoomId).emit("preview-message", {
      roomId,
      message,
      participants: this.roomManager.getRoomParticipants(roomId),
      aiParticipants: this.getActiveAIParticipants(),
    });

    if (message.senderType === "ai") {
      this.metricsService.recordAIMessage(
        roomId,
        message.aiId || message.sender,
        message,
      );
    }

    if (
      message.senderType === "ai" &&
      this.chatAssistant.service &&
      !message.isInternalResponder
    ) {
      await this.chatAssistant.trigger({
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

  // --- Connection lifecycle ---

  handleConnection(socket: Socket): void {
    console.log(`User connected: ${socket.id}`);
    this.setupSocketEvents(socket);
    socket.join(this.previewRoomId);

    socket.emit("connection-established", {
      socketId: socket.id,
      serverTime: Date.now(),
      availableRooms: this.roomManager.getRoomList(),
    });

    this.sendRecentMessages(socket).catch((error) => {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn("Failed to send recent messages on connect:", msg);
    });
  }

  setupSocketEvents(socket: Socket): void {
    socket.on("join-room", (data: JoinRoomPayload) => this.handleJoinRoom(socket, data));
    socket.on("user-message", (data: UserMessagePayload) => this.handleUserMessage(socket, data));
    socket.on("change-topic", (data: TopicChangePayload) => this.handleTopicChange(socket, data));
    socket.on("user-typing-start", () => this.handleUserTyping(socket, true));
    socket.on("user-typing-stop", () => this.handleUserTyping(socket, false));
    socket.on("get-room-info", (data: unknown) => this.handleGetRoomInfo(socket, data));
    socket.on("get-ai-status", () => this.handleGetAIStatus(socket));
    socket.on("admin-wake-ais", (data: unknown) => this.handleAdminWakeAIs(socket, data));
    socket.on("admin-sleep-ais", (data: unknown) => this.handleAdminSleepAIs(socket, data));
    socket.on("disconnect", () => this.handleDisconnect(socket));

    // Dashboard events
    socket.on("join-dashboard", () => {
      socket.join("dashboard");
      socket.emit("metrics-update", this.metricsService.getDetailedMetrics());
      socket.emit("ai-participants", this.getActiveAIParticipants());
    });
    socket.on("get-metrics", () => socket.emit("metrics-update", this.metricsService.getDetailedMetrics()));
    socket.on("get-ai-participants", () => socket.emit("ai-participants", this.getActiveAIParticipants()));
    socket.on("get-metrics-history", (data: MetricsHistoryPayload) => {
      socket.emit("metrics-history", this.metricsService.getMetricsHistory(data?.duration));
    });
    socket.on("error", (error: Error) => console.error(`Socket ${socket.id} error:`, error));
  }

  // --- Event handlers ---

  handleJoinRoom(socket: Socket, data: JoinRoomPayload): void {
    try {
      const { username, roomId = "default" } = data;

      if (!username || username.trim().length === 0) {
        socket.emit("error", { message: "Username is required" });
        return;
      }

      if (username.length > USERNAME_MAX_LENGTH || !/^[a-zA-Z0-9_-]+$/.test(username)) {
        socket.emit("error", {
          message: `Username must be 1-${USERNAME_MAX_LENGTH} characters, letters, numbers, dash, underscore only`,
        });
        return;
      }

      const userData = { username: username.trim(), joinedAt: Date.now() };
      const room = this.roomManager.joinRoom(socket.id, roomId, userData);

      if (!room) {
        socket.emit("error", { message: "Failed to join room - room may be full" });
        return;
      }

      socket.join(roomId);

      // Resolve private room AI scoping
      const privateAiId = getPrivateRoomAiId(roomId);
      if (privateAiId) {
        const directMatch = this.chatOrchestrator.aiServices.has(privateAiId) ? privateAiId : null;
        const normalizedMatch = directMatch
          ? null
          : this.chatOrchestrator.findAIByNormalizedAlias(normalizeRoomAiToken(privateAiId));
        const resolvedAiId = directMatch || normalizedMatch?.id || null;

        if (resolvedAiId) {
          this.chatOrchestrator.setRoomAllowedAIs(roomId, [resolvedAiId]);
        } else {
          this.chatOrchestrator.clearRoomAllowedAIs(roomId);
        }
      } else {
        this.chatOrchestrator.clearRoomAllowedAIs(roomId);
      }

      this.connectedUsers.set(socket.id, { ...userData, roomId });
      this.aiTracker.initializeRoom(roomId);
      this.metricsService.updateActiveUsers(this.connectedUsers.size);
      this.metricsService.updateActiveRooms(this.roomManager.getStats().totalRooms);

      socket.emit("room-joined", {
        roomId,
        roomName: room.name,
        topic: room.topic,
        participants: this.roomManager.getRoomParticipants(roomId),
        aiParticipants: this.getActiveAIParticipants(),
      });

      socket.leave(this.previewRoomId);
      this.sendRecentMessages(socket, roomId).catch((error) => {
        const msg = error instanceof Error ? error.message : String(error);
        console.warn("Failed to send room history after join:", msg);
      });

      socket.to(roomId).emit("user-joined", { username: userData.username, timestamp: Date.now() });
      console.log(`${userData.username} joined room ${roomId}`);
    } catch (error) {
      console.error("Error handling join room:", error);
      socket.emit("error", { message: "Failed to join room" });
    }
  }

  async handleUserMessage(socket: Socket, data: UserMessagePayload): Promise<void> {
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
        socket.emit("error", { message: `Message too long (max ${MESSAGE_MAX_LENGTH} characters)` });
        return;
      }

      const ipAddress = getClientIp(socket);
      const rateLimitResult = await this.rateLimiter.check(ipAddress);

      if (!rateLimitResult.allowed) {
        const retryAfterSeconds = rateLimitResult.retryAfterMs
          ? Math.ceil(rateLimitResult.retryAfterMs / 1000)
          : undefined;
        const windowMinutes = Math.round(USER_MESSAGE_WINDOW_MS / 60_000);
        socket.emit("error", {
          message: `Rate limit exceeded: max ${USER_MESSAGE_LIMIT} messages per ${windowMinutes} minutes. Please wait before sending more.`,
          code: "RATE_LIMITED",
          retryAfterSeconds,
        });
        console.warn(`Rate limit exceeded for IP ${ipAddress || "unknown"} (user: ${user.username}, limit: ${USER_MESSAGE_LIMIT}/${windowMinutes}min)`);
        return;
      }

      const message: ChatMessage = {
        sender: user.username,
        content: content.trim(),
        senderType: "user",
        roomId: user.roomId,
        priority: 1000,
        suppressAIResponses: false,
      };

      const isChatAssistantQuery = this.chatAssistant.shouldHandle(content);
      if (isChatAssistantQuery) {
        message.suppressAIResponses = true;
      }

      this.aiTracker.onUserMessage(user.roomId, user.username);
      this.metricsService.recordUserMessage(user.roomId, user.username, message);

      if (isChatAssistantQuery) {
        console.info(
          `[ChatAssistant] User "${user.username}" mentioned @${this.chatAssistant.service?.name} with question:`,
          message.content,
        );
      }

      this.chatOrchestrator.addMessage(message);
      this.io.to(user.roomId).emit("user-typing-stop", { username: user.username, roomId: user.roomId });
      console.log(`Message from ${user.username} in ${user.roomId}: ${content.substring(0, 50)}...`);

      if (isChatAssistantQuery) {
        await this.chatAssistant.trigger({
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

  handleUserTyping(socket: Socket, isTyping: boolean): void {
    try {
      const user = this.connectedUsers.get(socket.id);
      if (!user) return;

      const eventName = isTyping ? "user-typing-start" : "user-typing-stop";
      this.io.to(user.roomId).emit(eventName, { username: user.username, roomId: user.roomId });
    } catch (error) {
      console.error("Error handling user typing state:", error);
    }
  }

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
        socket.emit("error", { message: `Topic too long (max ${TOPIC_MAX_LENGTH} characters)` });
        return;
      }

      const newTopic = topic.trim();
      const updated = this.roomManager.updateRoomTopic(user.roomId, newTopic, user.username);

      if (!updated) {
        socket.emit("error", { message: "Failed to update topic" });
        return;
      }

      this.chatOrchestrator.changeTopic(newTopic, user.username, user.roomId);
      console.log(`${user.username} changed topic in ${user.roomId} to: ${newTopic}`);
    } catch (error) {
      console.error("Error handling topic change:", error);
      socket.emit("error", { message: "Failed to change topic" });
    }
  }

  handleGetRoomInfo(socket: Socket, _data: unknown): void {
    try {
      const user = this.connectedUsers.get(socket.id);
      if (!user) {
        socket.emit("error", { message: "User not found - please rejoin" });
        return;
      }

      socket.emit("room-info", {
        room: this.roomManager.getRoom(user.roomId),
        participants: this.roomManager.getRoomParticipants(user.roomId),
        aiStatus: this.aiTracker.getRoomStatus(user.roomId),
        aiParticipants: this.getActiveAIParticipants(),
      });
    } catch (error) {
      console.error("Error getting room info:", error);
      socket.emit("error", { message: "Failed to get room info" });
    }
  }

  handleGetAIStatus(socket: Socket): void {
    try {
      socket.emit("ai-status", {
        orchestrator: this.chatOrchestrator.getStatus(),
        tracker: this.aiTracker.getStats(),
      });
    } catch (error) {
      console.error("Error getting AI status:", error);
      socket.emit("error", { message: "Failed to get AI status" });
    }
  }

  handleAdminWakeAIs(socket: Socket, _data: unknown): void {
    try {
      const user = this.connectedUsers.get(socket.id);
      if (!user) return;
      this.aiTracker.wakeUpAIs(user.roomId, `admin-wake-by-${user.username}`);
      this.chatOrchestrator.wakeUpAIs();
      socket.to(user.roomId).emit("admin-action", { action: "wake-ais", by: user.username });
    } catch (error) {
      console.error("Error waking AIs:", error);
    }
  }

  handleAdminSleepAIs(socket: Socket, _data: unknown): void {
    try {
      const user = this.connectedUsers.get(socket.id);
      if (!user) return;
      this.aiTracker.putAIsToSleep(user.roomId, `admin-sleep-by-${user.username}`);
      this.chatOrchestrator.putAIsToSleep();
      socket.to(user.roomId).emit("admin-action", { action: "sleep-ais", by: user.username });
    } catch (error) {
      console.error("Error sleeping AIs:", error);
    }
  }

  handleDisconnect(socket: Socket): void {
    try {
      const user = this.connectedUsers.get(socket.id);

      if (user) {
        socket.to(user.roomId).emit("user-left", { username: user.username, timestamp: Date.now() });
        this.io.to(user.roomId).emit("user-typing-stop", { username: user.username, roomId: user.roomId });
        console.log(`${user.username} disconnected from room ${user.roomId}`);
      }

      this.roomManager.cleanup(socket.id);
      this.connectedUsers.delete(socket.id);
      this.metricsService.updateActiveUsers(this.connectedUsers.size);
      this.metricsService.updateActiveRooms(this.roomManager.getStats().totalRooms);
    } catch (error) {
      console.error("Error handling disconnect:", error);
    }
  }

  // --- Helpers ---

  getActiveAIParticipants(): ActiveAIParticipant[] {
    return transformAIServicesToParticipants(this.chatOrchestrator.aiServices);
  }

  async getRecentMessages(roomId = "default"): Promise<ChatMessage[]> {
    return this.messageHistory.getRecentMessages(roomId, this.chatOrchestrator.contextManager);
  }

  async sendRecentMessages(socket: Socket, roomId = "default"): Promise<void> {
    try {
      const [messages, participants, aiParticipants] = await Promise.all([
        this.getRecentMessages(roomId),
        Promise.resolve(this.roomManager.getRoomParticipants(roomId)),
        Promise.resolve(this.getActiveAIParticipants()),
      ]);

      socket.emit("recent-messages", { roomId, messages, participants, aiParticipants });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn("Failed to send recent messages:", msg);
    }
  }

  getStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      rooms: this.roomManager.getStats(),
      aiTracker: this.aiTracker.getStats(),
      orchestrator: this.chatOrchestrator.getStatus(),
    };
  }

  // Backward-compatible method for external callers
  async triggerChatAssistant(payload: { roomId: string; content: string; origin?: Record<string, unknown> }): Promise<void> {
    return this.chatAssistant.trigger(payload);
  }
}

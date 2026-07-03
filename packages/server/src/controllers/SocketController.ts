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
import { handleBroadcastMessage as handleBroadcastMessageEvent } from "./socketBroadcastHandler.js";
import { handleConnection as handleConnectionEvent } from "./socketConnectionLifecycle.js";
import { registerSocketConnectionEvents } from "./socketConnectionEvents.js";
import {
  getRecentMessages as getRecentMessagesForRoom,
  sendRecentMessages as sendRecentMessagesToSocket,
} from "./socketRecentMessages.js";
import {
  handleAdminSleepAIs as handleAdminSleepAIsEvent,
  handleAdminWakeAIs as handleAdminWakeAIsEvent,
  handleDisconnect as handleDisconnectEvent,
  handleGetAIStatus as handleGetAIStatusEvent,
  handleGetRoomInfo as handleGetRoomInfoEvent,
  handleJoinRoom as handleJoinRoomEvent,
  handleTopicChange as handleTopicChangeEvent,
  handleUserMessage as handleUserMessageEvent,
  handleUserTyping as handleUserTypingEvent,
  type SocketHandlerContext,
} from "./socketEventHandlers.js";
import { transformAIServicesToParticipants } from "@/utils/aiServiceUtils.js";
import {
  USER_MESSAGE_LIMIT,
  USER_MESSAGE_WINDOW_MS,
} from "@/config/serverConfig.js";
import { SOCKET_EVENTS } from "@ai-chat/ai-configs";
import type {
  ActiveAIParticipant,
  ChatMessage,
  ConnectedUser,
  JoinRoomPayload,
  TopicChangePayload,
  UserMessagePayload,
} from "@/types.js";

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

  get chatAssistantService(): ChatAssistantService | null {
    return this.chatAssistant.service;
  }

  get chatAssistantMetadata() {
    return this.chatAssistant.metadata;
  }

  async handleBroadcastMessage(
    message: ChatMessage,
    roomId: string,
  ): Promise<void> {
    await handleBroadcastMessageEvent(
      this.getHandlerContext(),
      message,
      roomId,
    );
  }

  handleConnection(socket: Socket): void {
    handleConnectionEvent(socket, {
      previewRoomId: this.previewRoomId,
      roomManager: this.roomManager,
      setupSocketEvents: (clientSocket) => this.setupSocketEvents(clientSocket),
      sendRecentMessages: (clientSocket) =>
        this.sendRecentMessages(clientSocket),
    });
  }

  setupSocketEvents(socket: Socket): void {
    registerSocketConnectionEvents({
      socket,
      metricsService: this.metricsService,
      getActiveAIParticipants: () => this.getActiveAIParticipants(),
      handlers: {
        joinRoom: (data) => this.handleJoinRoom(socket, data),
        userMessage: (data) => this.handleUserMessage(socket, data),
        changeTopic: (data) => this.handleTopicChange(socket, data),
        userTyping: (isTyping) => this.handleUserTyping(socket, isTyping),
        getRoomInfo: (data) => this.handleGetRoomInfo(socket, data),
        getAIStatus: () => this.handleGetAIStatus(socket),
        adminWakeAIs: (data) => this.handleAdminWakeAIs(socket, data),
        adminSleepAIs: (data) => this.handleAdminSleepAIs(socket, data),
        disconnect: () => this.handleDisconnect(socket),
      },
    });
  }

  handleJoinRoom(socket: Socket, data: JoinRoomPayload): void {
    handleJoinRoomEvent(this.getHandlerContext(), socket, data);
  }

  async handleUserMessage(
    socket: Socket,
    data: UserMessagePayload,
  ): Promise<void> {
    await handleUserMessageEvent(this.getHandlerContext(), socket, data);
  }

  handleUserTyping(socket: Socket, isTyping: boolean): void {
    handleUserTypingEvent(this.getHandlerContext(), socket, isTyping);
  }

  handleTopicChange(socket: Socket, data: TopicChangePayload): void {
    handleTopicChangeEvent(this.getHandlerContext(), socket, data);
  }

  handleGetRoomInfo(socket: Socket, _data: unknown): void {
    handleGetRoomInfoEvent(this.getHandlerContext(), socket);
  }

  handleGetAIStatus(socket: Socket): void {
    handleGetAIStatusEvent(this.getHandlerContext(), socket);
  }

  handleAdminWakeAIs(socket: Socket, _data: unknown): void {
    handleAdminWakeAIsEvent(this.getHandlerContext(), socket);
  }

  handleAdminSleepAIs(socket: Socket, _data: unknown): void {
    handleAdminSleepAIsEvent(this.getHandlerContext(), socket);
  }

  handleDisconnect(socket: Socket): void {
    handleDisconnectEvent(this.getHandlerContext(), socket);
  }

  getActiveAIParticipants(): ActiveAIParticipant[] {
    return transformAIServicesToParticipants(this.chatOrchestrator.aiServices);
  }

  broadcastAIParticipants(): void {
    this.io.emit(SOCKET_EVENTS.AI_PARTICIPANTS, this.getActiveAIParticipants());
  }

  async getRecentMessages(roomId = "default"): Promise<ChatMessage[]> {
    return getRecentMessagesForRoom(
      this.messageHistory,
      this.chatOrchestrator,
      roomId,
    );
  }

  async sendRecentMessages(socket: Socket, roomId = "default"): Promise<void> {
    await sendRecentMessagesToSocket(socket, roomId, {
      messageHistory: this.messageHistory,
      chatOrchestrator: this.chatOrchestrator,
      roomManager: this.roomManager,
      getActiveAIParticipants: () => this.getActiveAIParticipants(),
    });
  }

  getStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      rooms: this.roomManager.getStats(),
      aiTracker: this.aiTracker.getStats(),
      orchestrator: this.chatOrchestrator.getStatus(),
    };
  }

  async triggerChatAssistant(payload: {
    roomId: string;
    content: string;
    origin?: Record<string, unknown>;
  }): Promise<void> {
    return this.chatAssistant.trigger(payload);
  }

  private getHandlerContext(): SocketHandlerContext {
    return {
      io: this.io,
      chatOrchestrator: this.chatOrchestrator,
      metricsService: this.metricsService,
      messageHistory: this.messageHistory,
      roomManager: this.roomManager,
      aiTracker: this.aiTracker,
      connectedUsers: this.connectedUsers,
      chatAssistant: this.chatAssistant,
      rateLimiter: this.rateLimiter,
      previewRoomId: this.previewRoomId,
      getActiveAIParticipants: () => this.getActiveAIParticipants(),
      sendRecentMessages: (socket, roomId) =>
        this.sendRecentMessages(socket, roomId),
    };
  }
}

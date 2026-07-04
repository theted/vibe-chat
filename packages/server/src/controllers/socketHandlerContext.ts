import type { ChatOrchestrator } from "@ai-chat/core";
import type { Server, Socket } from "socket.io";

import type { AIMessageTracker } from "@/managers/AIMessageTracker.js";
import type { RoomManager } from "@/managers/RoomManager.js";
import type { ChatAssistantHandler } from "@/controllers/ChatAssistantHandler.js";
import type { MessageHistoryService } from "@/services/MessageHistoryService.js";
import type { MetricsService } from "@/services/MetricsService.js";
import type { RateLimiter } from "@/services/RateLimiter.js";
import type { ActiveAIParticipant, ConnectedUser } from "@/types.js";

export type SocketHandlerContext = {
  io: Server;
  chatOrchestrator: ChatOrchestrator;
  metricsService: MetricsService;
  messageHistory: MessageHistoryService;
  roomManager: RoomManager;
  aiTracker: AIMessageTracker;
  connectedUsers: Map<string, ConnectedUser>;
  chatAssistant: ChatAssistantHandler;
  rateLimiter: RateLimiter;
  previewRoomId: string;
  getActiveAIParticipants: () => ActiveAIParticipant[];
  sendRecentMessages: (socket: Socket, roomId?: string) => Promise<void>;
};

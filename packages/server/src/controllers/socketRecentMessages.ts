import type { ChatOrchestrator } from "@ai-chat/core";
import type { Socket } from "socket.io";
import { SOCKET_EVENTS } from "@ai-chat/ai-configs";

import type { RoomManager } from "@/managers/RoomManager.js";
import type { MessageHistoryService } from "@/services/MessageHistoryService.js";
import type { ActiveAIParticipant, ChatMessage } from "@/types.js";
import { warnSocketError } from "@/utils/socketErrors.js";

export const getRecentMessages = (
  messageHistory: MessageHistoryService,
  chatOrchestrator: ChatOrchestrator,
  roomId = "default",
): Promise<ChatMessage[]> =>
  messageHistory.getRecentMessages(roomId, chatOrchestrator.contextManager);

export const sendRecentMessages = async (
  socket: Socket,
  roomId: string,
  options: {
    messageHistory: MessageHistoryService;
    chatOrchestrator: ChatOrchestrator;
    roomManager: RoomManager;
    getActiveAIParticipants: () => ActiveAIParticipant[];
  },
): Promise<void> => {
  try {
    const [messages, participants, aiParticipants] = await Promise.all([
      getRecentMessages(
        options.messageHistory,
        options.chatOrchestrator,
        roomId,
      ),
      Promise.resolve(options.roomManager.getRoomParticipants(roomId)),
      Promise.resolve(options.getActiveAIParticipants()),
    ]);

    socket.emit(SOCKET_EVENTS.RECENT_MESSAGES, {
      roomId,
      messages,
      participants,
      aiParticipants,
    });
  } catch (error) {
    warnSocketError("Failed to send recent messages", error);
  }
};

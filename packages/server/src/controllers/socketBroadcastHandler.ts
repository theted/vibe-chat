import { SOCKET_EVENTS } from "@ai-chat/ai-configs";

import type { ChatMessage } from "@/types.js";
import { warnSocketError } from "@/utils/socketErrors.js";
import type { SocketHandlerContext } from "./socketEventHandlers.js";

export const handleBroadcastMessage = async (
  context: SocketHandlerContext,
  message: ChatMessage,
  roomId: string,
): Promise<void> => {
  try {
    await context.messageHistory.storeMessage(roomId, message);
  } catch (error) {
    warnSocketError("Failed to persist message history", error);
  }

  context.io.to(roomId).emit(SOCKET_EVENTS.NEW_MESSAGE, message);
  context.io.to(context.previewRoomId).emit(SOCKET_EVENTS.PREVIEW_MESSAGE, {
    roomId,
    message,
    participants: context.roomManager.getRoomParticipants(roomId),
    aiParticipants: context.getActiveAIParticipants(),
  });

  if (message.senderType === "ai") {
    context.metricsService.recordAIMessage(
      roomId,
      message.aiId || message.sender,
      message,
    );
  }

  if (
    message.senderType === "ai" &&
    context.chatAssistant.service &&
    !message.isInternalResponder
  ) {
    await context.chatAssistant.trigger({
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
};

import type { Socket } from "socket.io";
import { SOCKET_EVENTS } from "@ai-chat/ai-configs";

import { logSocketError, replySocketError } from "@/utils/socketErrors.js";
import type { SocketHandlerContext } from "./socketHandlerContext.js";

export const handleGetAIStatus = (
  context: SocketHandlerContext,
  socket: Socket,
): void => {
  try {
    socket.emit(SOCKET_EVENTS.AI_STATUS, {
      orchestrator: context.chatOrchestrator.getStatus(),
    });
  } catch (error) {
    replySocketError(
      socket,
      "getting AI status",
      error,
      "Failed to get AI status",
    );
  }
};

export const handleAdminWakeAIs = (
  context: SocketHandlerContext,
  socket: Socket,
): void => {
  try {
    const user = context.connectedUsers.get(socket.id);
    if (!user) {
      return;
    }

    context.chatOrchestrator.wakeUpAIs(user.roomId);
    socket.to(user.roomId).emit(SOCKET_EVENTS.ADMIN_ACTION, {
      action: "wake-ais",
      by: user.username,
    });
  } catch (error) {
    logSocketError("waking AIs", error);
  }
};

export const handleAdminSleepAIs = (
  context: SocketHandlerContext,
  socket: Socket,
): void => {
  try {
    const user = context.connectedUsers.get(socket.id);
    if (!user) {
      return;
    }

    context.chatOrchestrator.putAIsToSleep(
      user.roomId,
      `admin-sleep-by-${user.username}`,
    );
    socket.to(user.roomId).emit(SOCKET_EVENTS.ADMIN_ACTION, {
      action: "sleep-ais",
      by: user.username,
    });
  } catch (error) {
    logSocketError("sleeping AIs", error);
  }
};

/**
 * Slash commands that need the server: /clear (any joined user, announced,
 * once per room per CLEAR_ROOM_COOLDOWN_MS) and /debug (the prompt behind
 * the room's latest AI reply, sent only to whoever asked).
 */

import type { Socket } from "socket.io";
import { DEFAULT_ROOM_ID, SOCKET_EVENTS } from "@ai-chat/ai-configs";

import { replySocketError } from "@/utils/socketErrors.js";
import type { SocketHandlerContext } from "./socketHandlerContext.js";

const NOT_JOINED_ERROR = { message: "User not found - please rejoin" };
const MS_PER_SECOND = 1000;

export const handleClearRoom = async (
  context: SocketHandlerContext,
  socket: Socket,
): Promise<void> => {
  try {
    const user = context.connectedUsers.get(socket.id);
    if (!user) {
      socket.emit(SOCKET_EVENTS.ERROR, NOT_JOINED_ERROR);
      return;
    }

    const { roomId, username } = user;
    const cooldown = await context.clearRoomLimiter.check(roomId);
    if (!cooldown.allowed) {
      const seconds = Math.ceil((cooldown.retryAfterMs ?? 0) / MS_PER_SECOND);
      socket.emit(SOCKET_EVENTS.ERROR, {
        message: `The chat was cleared moments ago. Try again in ${seconds}s.`,
      });
      return;
    }

    context.chatOrchestrator.clearRoom(roomId);
    await context.messageHistory.clearRoom(roomId);

    // Guests reading the main room through its preview see it empty too
    const rooms =
      roomId === DEFAULT_ROOM_ID ? [roomId, context.previewRoomId] : [roomId];
    context.io.to(rooms).emit(SOCKET_EVENTS.ROOM_CLEARED, {
      roomId,
      by: username,
      timestamp: Date.now(),
    });
    console.info(`🧹 ${username} cleared ${roomId}`);
  } catch (error) {
    replySocketError(
      socket,
      "clearing the room",
      error,
      "Failed to clear the chat",
    );
  }
};

export const handleGetLastPrompt = (
  context: SocketHandlerContext,
  socket: Socket,
): void => {
  try {
    const user = context.connectedUsers.get(socket.id);
    if (!user) {
      socket.emit(SOCKET_EVENTS.ERROR, NOT_JOINED_ERROR);
      return;
    }

    socket.emit(SOCKET_EVENTS.LAST_PROMPT, {
      roomId: user.roomId,
      prompt: context.chatOrchestrator.getLatestPrompt(user.roomId),
    });
  } catch (error) {
    replySocketError(
      socket,
      "getting the last prompt",
      error,
      "Failed to get the last prompt",
    );
  }
};

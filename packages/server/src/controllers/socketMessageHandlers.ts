import type { Socket } from "socket.io";
import { SOCKET_EVENTS } from "@ai-chat/ai-configs";

import {
  USER_MESSAGE_LIMIT,
  USER_MESSAGE_WINDOW_MS,
} from "@/config/serverConfig.js";
import { getClientIp } from "@/utils/httpUtils.js";
import type { ChatMessage, UserMessagePayload } from "@/types.js";
import { logSocketError, replySocketError } from "@/utils/socketErrors.js";
import type { SocketHandlerContext } from "./socketHandlerContext.js";
import { getRateLimitError, validateMessageContent } from "./socketUtils.js";

export const handleUserMessage = async (
  context: SocketHandlerContext,
  socket: Socket,
  data: UserMessagePayload,
): Promise<void> => {
  try {
    const user = context.connectedUsers.get(socket.id);
    if (!user) {
      socket.emit(SOCKET_EVENTS.ERROR, {
        message: "User not found - please rejoin",
      });
      return;
    }

    const contentValidation = validateMessageContent(data.content);
    if (!contentValidation.valid) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: contentValidation.message });
      return;
    }

    const ipAddress = getClientIp(socket);
    const rateLimitResult = await context.rateLimiter.check(ipAddress);

    if (!rateLimitResult.allowed) {
      const windowMinutes = Math.round(USER_MESSAGE_WINDOW_MS / 60_000);
      socket.emit(
        SOCKET_EVENTS.ERROR,
        getRateLimitError(rateLimitResult.retryAfterMs),
      );
      console.warn(
        `Rate limit exceeded for IP ${ipAddress || "unknown"} (user: ${user.username}, limit: ${USER_MESSAGE_LIMIT}/${windowMinutes}min)`,
      );
      return;
    }

    const message: ChatMessage = {
      sender: user.username,
      content: contentValidation.value,
      senderType: "user",
      roomId: user.roomId,
      priority: 1000,
      suppressAIResponses: false,
    };

    const isChatAssistantQuery = context.chatAssistant.shouldHandle(
      contentValidation.value,
    );
    if (isChatAssistantQuery) {
      message.suppressAIResponses = true;
    }

    context.aiTracker.onUserMessage(user.roomId, user.username);
    context.metricsService.recordUserMessage(
      user.roomId,
      user.username,
      message,
    );

    if (isChatAssistantQuery) {
      console.info(
        `[ChatAssistant] User "${user.username}" mentioned @${context.chatAssistant.service?.name} with question:`,
        message.content,
      );
    }

    context.chatOrchestrator.addMessage(message);
    context.io.to(user.roomId).emit(SOCKET_EVENTS.USER_TYPING_STOP, {
      username: user.username,
      roomId: user.roomId,
    });
    console.log(
      `Message from ${user.username} in ${user.roomId}: ${contentValidation.value.substring(0, 50)}...`,
    );

    if (isChatAssistantQuery) {
      await context.chatAssistant.trigger({
        roomId: user.roomId,
        content: message.content,
        origin: { type: "user", username: user.username },
      });
    }
  } catch (error) {
    replySocketError(socket, "handling user message", error, "Failed to send message");
  }
};

export const handleUserTyping = (
  context: SocketHandlerContext,
  socket: Socket,
  isTyping: boolean,
): void => {
  try {
    const user = context.connectedUsers.get(socket.id);
    if (!user) {
      return;
    }

    const eventName = isTyping
      ? SOCKET_EVENTS.USER_TYPING_START
      : SOCKET_EVENTS.USER_TYPING_STOP;
    context.io.to(user.roomId).emit(eventName, {
      username: user.username,
      roomId: user.roomId,
    });
  } catch (error) {
    logSocketError("handling user typing state", error);
  }
};

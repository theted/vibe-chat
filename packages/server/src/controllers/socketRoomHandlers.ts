import type { Socket } from "socket.io";
import { SOCKET_EVENTS } from "@ai-chat/ai-configs";

import type { JoinRoomPayload, TopicChangePayload } from "@/types.js";
import {
  logSocketError,
  replySocketError,
  warnSocketError,
} from "@/utils/socketErrors.js";
import type { SocketHandlerContext } from "./socketHandlerContext.js";
import {
  applyRoomAIScope,
  validateTopic,
  validateUsername,
} from "./socketUtils.js";

export const handleJoinRoom = (
  context: SocketHandlerContext,
  socket: Socket,
  data: JoinRoomPayload,
): void => {
  try {
    const { username, roomId = "default" } = data;
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: usernameValidation.message });
      return;
    }

    const userData = {
      username: usernameValidation.value,
      joinedAt: Date.now(),
    };
    const room = context.roomManager.joinRoom(socket.id, roomId, userData);

    if (!room) {
      socket.emit(SOCKET_EVENTS.ERROR, {
        message: "Failed to join room - room may be full",
      });
      return;
    }

    socket.join(roomId);
    applyRoomAIScope(context.chatOrchestrator, roomId);

    context.connectedUsers.set(socket.id, { ...userData, roomId });
    context.aiTracker.initializeRoom(roomId);
    context.metricsService.updateActiveUsers(context.connectedUsers.size);
    context.metricsService.updateActiveRooms(
      context.roomManager.getStats().totalRooms,
    );

    socket.emit(SOCKET_EVENTS.ROOM_JOINED, {
      roomId,
      roomName: room.name,
      topic: room.topic,
      participants: context.roomManager.getRoomParticipants(roomId),
      aiParticipants: context.getActiveAIParticipants(),
    });

    socket.leave(context.previewRoomId);
    context.sendRecentMessages(socket, roomId).catch((error) => {
      warnSocketError("Failed to send room history after join", error);
    });

    socket.to(roomId).emit(SOCKET_EVENTS.USER_JOINED, {
      username: userData.username,
      timestamp: Date.now(),
    });
    console.log(`${userData.username} joined room ${roomId}`);
  } catch (error) {
    replySocketError(socket, "handling join room", error, "Failed to join room");
  }
};

export const handleTopicChange = (
  context: SocketHandlerContext,
  socket: Socket,
  data: TopicChangePayload,
): void => {
  try {
    const user = context.connectedUsers.get(socket.id);
    if (!user) {
      socket.emit(SOCKET_EVENTS.ERROR, {
        message: "User not found - please rejoin",
      });
      return;
    }

    const topicValidation = validateTopic(data.topic);
    if (!topicValidation.valid) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: topicValidation.message });
      return;
    }

    const newTopic = topicValidation.value;
    const updated = context.roomManager.updateRoomTopic(
      user.roomId,
      newTopic,
      user.username,
    );

    if (!updated) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: "Failed to update topic" });
      return;
    }

    context.chatOrchestrator.changeTopic(newTopic, user.username, user.roomId);
    console.log(
      `${user.username} changed topic in ${user.roomId} to: ${newTopic}`,
    );
  } catch (error) {
    replySocketError(socket, "handling topic change", error, "Failed to change topic");
  }
};

export const handleGetRoomInfo = (
  context: SocketHandlerContext,
  socket: Socket,
): void => {
  try {
    const user = context.connectedUsers.get(socket.id);
    if (!user) {
      socket.emit(SOCKET_EVENTS.ERROR, {
        message: "User not found - please rejoin",
      });
      return;
    }

    socket.emit(SOCKET_EVENTS.ROOM_INFO, {
      room: context.roomManager.getRoom(user.roomId),
      participants: context.roomManager.getRoomParticipants(user.roomId),
      aiStatus: context.aiTracker.getRoomStatus(user.roomId),
      aiParticipants: context.getActiveAIParticipants(),
    });
  } catch (error) {
    replySocketError(socket, "getting room info", error, "Failed to get room info");
  }
};

export const handleDisconnect = (
  context: SocketHandlerContext,
  socket: Socket,
): void => {
  try {
    const user = context.connectedUsers.get(socket.id);

    if (user) {
      socket.to(user.roomId).emit(SOCKET_EVENTS.USER_LEFT, {
        username: user.username,
        timestamp: Date.now(),
      });
      context.io.to(user.roomId).emit(SOCKET_EVENTS.USER_TYPING_STOP, {
        username: user.username,
        roomId: user.roomId,
      });
      console.log(`${user.username} disconnected from room ${user.roomId}`);
    }

    context.roomManager.cleanup(socket.id);
    context.connectedUsers.delete(socket.id);
    context.metricsService.updateActiveUsers(context.connectedUsers.size);
    context.metricsService.updateActiveRooms(
      context.roomManager.getStats().totalRooms,
    );
  } catch (error) {
    logSocketError("handling disconnect", error);
  }
};

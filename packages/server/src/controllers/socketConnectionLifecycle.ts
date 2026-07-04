import type { Socket } from "socket.io";
import { SOCKET_EVENTS } from "@ai-chat/ai-configs";

import type { RoomManager } from "@/managers/RoomManager.js";
import { warnSocketError } from "@/utils/socketErrors.js";

export const handleConnection = (
  socket: Socket,
  options: {
    previewRoomId: string;
    roomManager: RoomManager;
    setupSocketEvents: (socket: Socket) => void;
    sendRecentMessages: (socket: Socket) => Promise<void>;
  },
): void => {
  console.log(`User connected: ${socket.id}`);
  options.setupSocketEvents(socket);
  socket.join(options.previewRoomId);

  socket.emit(SOCKET_EVENTS.CONNECTION_ESTABLISHED, {
    socketId: socket.id,
    serverTime: Date.now(),
    availableRooms: options.roomManager.getRoomList(),
  });

  options.sendRecentMessages(socket).catch((error) => {
    warnSocketError("Failed to send recent messages on connect", error);
  });
};

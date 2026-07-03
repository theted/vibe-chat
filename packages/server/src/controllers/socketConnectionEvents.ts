import type { Socket } from "socket.io";
import { SOCKET_EVENTS } from "@ai-chat/ai-configs";

import type { MetricsService } from "@/services/MetricsService.js";
import type {
  ActiveAIParticipant,
  JoinRoomPayload,
  TopicChangePayload,
  UserMessagePayload,
} from "@/types.js";
import { registerDashboardEvents } from "./socketDashboardEvents.js";

type SocketConnectionEventHandlers = {
  joinRoom: (data: JoinRoomPayload) => void;
  userMessage: (data: UserMessagePayload) => void;
  changeTopic: (data: TopicChangePayload) => void;
  userTyping: (isTyping: boolean) => void;
  getRoomInfo: (data: unknown) => void;
  getAIStatus: () => void;
  adminWakeAIs: (data: unknown) => void;
  adminSleepAIs: (data: unknown) => void;
  disconnect: () => void;
};

type SocketConnectionEventsOptions = {
  socket: Socket;
  metricsService: MetricsService;
  getActiveAIParticipants: () => ActiveAIParticipant[];
  handlers: SocketConnectionEventHandlers;
};

export const registerSocketConnectionEvents = ({
  socket,
  metricsService,
  getActiveAIParticipants,
  handlers,
}: SocketConnectionEventsOptions): void => {
  socket.on(SOCKET_EVENTS.JOIN_ROOM, handlers.joinRoom);
  socket.on(SOCKET_EVENTS.USER_MESSAGE, handlers.userMessage);
  socket.on(SOCKET_EVENTS.CHANGE_TOPIC, handlers.changeTopic);
  socket.on(SOCKET_EVENTS.USER_TYPING_START, () => handlers.userTyping(true));
  socket.on(SOCKET_EVENTS.USER_TYPING_STOP, () => handlers.userTyping(false));
  socket.on(SOCKET_EVENTS.GET_ROOM_INFO, handlers.getRoomInfo);
  socket.on(SOCKET_EVENTS.GET_AI_STATUS, handlers.getAIStatus);
  socket.on(SOCKET_EVENTS.ADMIN_WAKE_AIS, handlers.adminWakeAIs);
  socket.on(SOCKET_EVENTS.ADMIN_SLEEP_AIS, handlers.adminSleepAIs);
  socket.on("disconnect", handlers.disconnect);

  registerDashboardEvents({
    socket,
    metricsService,
    getActiveAIParticipants,
  });

  socket.on(SOCKET_EVENTS.ERROR, (error: Error) => {
    console.error(`Socket ${socket.id} error:`, error);
  });
};

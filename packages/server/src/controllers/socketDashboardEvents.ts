import type { Socket } from "socket.io";
import { SOCKET_EVENTS } from "@ai-chat/ai-configs";

import type { MetricsService } from "@/services/MetricsService.js";
import type { ActiveAIParticipant, MetricsHistoryPayload } from "@/types.js";

type DashboardEventOptions = {
  socket: Socket;
  metricsService: MetricsService;
  getActiveAIParticipants: () => ActiveAIParticipant[];
};

export const registerDashboardEvents = ({
  socket,
  metricsService,
  getActiveAIParticipants,
}: DashboardEventOptions): void => {
  socket.on(SOCKET_EVENTS.JOIN_DASHBOARD, () => {
    socket.join("dashboard");
    socket.emit(
      SOCKET_EVENTS.METRICS_UPDATE,
      metricsService.getDetailedMetrics(),
    );
    socket.emit(SOCKET_EVENTS.AI_PARTICIPANTS, getActiveAIParticipants());
  });

  socket.on(SOCKET_EVENTS.GET_METRICS, () => {
    socket.emit(
      SOCKET_EVENTS.METRICS_UPDATE,
      metricsService.getDetailedMetrics(),
    );
  });

  socket.on(SOCKET_EVENTS.GET_AI_PARTICIPANTS, () => {
    socket.emit(SOCKET_EVENTS.AI_PARTICIPANTS, getActiveAIParticipants());
  });

  socket.on(
    SOCKET_EVENTS.GET_METRICS_HISTORY,
    (data: MetricsHistoryPayload) => {
      socket.emit(
        SOCKET_EVENTS.METRICS_HISTORY,
        metricsService.getMetricsHistory(data?.duration),
      );
    },
  );
};

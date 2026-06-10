/**
 * useDashboardMetrics — socket wiring for the dashboard: joins the
 * dashboard room, subscribes to metrics/participant updates, and refreshes
 * metrics on an interval while connected.
 */

import { useEffect, useState } from "react";
import { SOCKET_EVENTS } from "@ai-chat/ai-configs";
import { useSocket } from "@/hooks/useSocket";
import { SERVER_URL } from "@/constants/chat";
import {
  INITIAL_METRICS,
  METRICS_HISTORY_DURATION_MS,
  METRICS_REFRESH_INTERVAL_MS,
} from "@/config/dashboard";
import type { ConnectionStatus, DashboardMetrics } from "@/types";
import type { AiParticipant } from "@/config/aiParticipants";

export const useDashboardMetrics = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>(INITIAL_METRICS);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
  });
  const [aiParticipants, setAiParticipants] = useState<AiParticipant[]>([]);

  const { on, off, emit } = useSocket(SERVER_URL);

  useEffect(() => {
    const handleConnect = () => {
      setConnectionStatus({ connected: true });
      emit(SOCKET_EVENTS.JOIN_DASHBOARD);
      emit(SOCKET_EVENTS.GET_METRICS);
      emit(SOCKET_EVENTS.GET_METRICS_HISTORY, { duration: METRICS_HISTORY_DURATION_MS });
      emit(SOCKET_EVENTS.GET_AI_PARTICIPANTS);
    };

    const handleDisconnect = () => {
      setConnectionStatus({ connected: false });
    };

    const handleMetrics = (data: unknown) => {
      setMetrics(data as DashboardMetrics);
    };

    const handleAiParticipants = (data: unknown) => {
      setAiParticipants(Array.isArray(data) ? data : []);
    };

    on("connect", handleConnect);
    on("disconnect", handleDisconnect);
    on(SOCKET_EVENTS.METRICS_UPDATE, handleMetrics);
    on(SOCKET_EVENTS.AI_PARTICIPANTS, handleAiParticipants);

    emit(SOCKET_EVENTS.JOIN_DASHBOARD);
    emit(SOCKET_EVENTS.GET_AI_PARTICIPANTS);

    return () => {
      off("connect", handleConnect);
      off("disconnect", handleDisconnect);
      off(SOCKET_EVENTS.METRICS_UPDATE, handleMetrics);
      off(SOCKET_EVENTS.AI_PARTICIPANTS, handleAiParticipants);
    };
  }, [on, off, emit]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (connectionStatus.connected) {
        emit(SOCKET_EVENTS.GET_METRICS);
      }
    }, METRICS_REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [connectionStatus.connected, emit]);

  return { metrics, connectionStatus, aiParticipants };
};

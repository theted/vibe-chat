/**
 * OrchestratorEventBridge - Wires ChatOrchestrator events to Socket.IO and metrics
 */

import type { Server } from "socket.io";
import type { ChatOrchestrator } from "@ai-chat/core";
import type { MetricsService } from "@/services/MetricsService.js";
import type { ChatMessage } from "@/types.js";
import { SOCKET_EVENTS } from "@ai-chat/ai-configs";
import { describeError } from "@/utils/socketErrors.js";

type BroadcastHandler = (message: ChatMessage, roomId: string) => Promise<void>;

/**
 * Bridges orchestrator domain events to Socket.IO emissions and metrics recording.
 */
export const setupOrchestratorEventBridge = (options: {
  chatOrchestrator: ChatOrchestrator;
  io: Server;
  metricsService: MetricsService;
  onBroadcast: BroadcastHandler;
}): void => {
  const { chatOrchestrator, io, metricsService, onBroadcast } = options;

  chatOrchestrator.on(
    "message-broadcast",
    async ({ message, roomId }: { message: ChatMessage; roomId: string }) => {
      try {
        await onBroadcast(message, roomId);
      } catch (error) {
        console.error(
          `[OrchestratorEventBridge] Failed to broadcast message in room ${roomId}:`,
          describeError(error),
        );
      }
    },
  );

  chatOrchestrator.on(
    "ais-sleeping",
    ({ reason }: { reason?: string }) => {
      io.emit(SOCKET_EVENTS.AI_STATUS_CHANGED, { status: "sleeping", reason });
    },
  );

  chatOrchestrator.on("ais-awakened", () => {
    io.emit(SOCKET_EVENTS.AI_STATUS_CHANGED, { status: "active" });
  });

  chatOrchestrator.on(
    "ai-generating-start",
    (payload: { roomId?: string }) => {
      if (!payload?.roomId) return;
      io.to(payload.roomId).emit(SOCKET_EVENTS.AI_GENERATING_START, payload);
    },
  );

  chatOrchestrator.on(
    "ai-generating-stop",
    (payload: { roomId?: string }) => {
      if (!payload?.roomId) return;
      io.to(payload.roomId).emit(SOCKET_EVENTS.AI_GENERATING_STOP, payload);
    },
  );

  chatOrchestrator.on(
    "ai-response",
    (payload: {
      providerKey?: string;
      modelKey?: string;
      responseTimeMs?: number;
    }) => {
      metricsService.recordAIResponse(payload);
    },
  );

  chatOrchestrator.on(
    "ai-error",
    (payload: {
      providerKey?: string;
      modelKey?: string;
      responseTimeMs?: number;
      error?: Error;
    }) => {
      const errorMessage =
        payload.error instanceof Error ? payload.error.message : undefined;
      metricsService.recordAIError({
        providerKey: payload.providerKey,
        modelKey: payload.modelKey,
        responseTimeMs: payload.responseTimeMs,
        errorMessage,
      });
    },
  );

  chatOrchestrator.on(
    "topic-changed",
    ({
      newTopic,
      changedBy,
      roomId,
    }: {
      newTopic: string;
      changedBy: string;
      roomId: string;
    }) => {
      io.to(roomId).emit(SOCKET_EVENTS.TOPIC_CHANGED, { newTopic, changedBy });
    },
  );

  chatOrchestrator.on("error", ({ error }: { error: Error }) => {
    console.error("Chat orchestrator error:", error);
  });
};

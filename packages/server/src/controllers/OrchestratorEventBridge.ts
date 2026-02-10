/**
 * OrchestratorEventBridge - Wires ChatOrchestrator events to Socket.IO and metrics
 */

import type { Server } from "socket.io";
import type { ChatOrchestrator } from "@ai-chat/core";
import type { MetricsService } from "@/services/MetricsService.js";
import type { ChatMessage } from "@/types.js";

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
      await onBroadcast(message, roomId);
    },
  );

  chatOrchestrator.on(
    "ais-sleeping",
    ({ reason }: { reason?: string }) => {
      io.emit("ai-status-changed", { status: "sleeping", reason });
    },
  );

  chatOrchestrator.on("ais-awakened", () => {
    io.emit("ai-status-changed", { status: "active" });
  });

  chatOrchestrator.on(
    "ai-generating-start",
    (payload: { roomId?: string }) => {
      if (!payload?.roomId) return;
      io.to(payload.roomId).emit("ai-generating-start", payload);
    },
  );

  chatOrchestrator.on(
    "ai-generating-stop",
    (payload: { roomId?: string }) => {
      if (!payload?.roomId) return;
      io.to(payload.roomId).emit("ai-generating-stop", payload);
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
      io.to(roomId).emit("topic-changed", { newTopic, changedBy });
    },
  );

  chatOrchestrator.on("error", ({ error }: { error: Error }) => {
    console.error("Chat orchestrator error:", error);
  });
};

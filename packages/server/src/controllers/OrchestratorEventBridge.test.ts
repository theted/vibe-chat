import { EventEmitter } from "node:events";
import { describe, expect, it } from "bun:test";
import type { ChatOrchestrator, RoomAIStatus } from "@ai-chat/core";
import { SOCKET_EVENTS } from "@ai-chat/ai-configs";
import type { Server } from "socket.io";
import type { MetricsService } from "@/services/MetricsService.js";

import { setupOrchestratorEventBridge } from "./OrchestratorEventBridge.js";

const PREVIEW_ROOM = "preview-default-room";

const makeBridge = () => {
  const orchestrator = new EventEmitter();
  const sent: { rooms: string | string[]; event: string; payload: unknown }[] =
    [];
  const io = {
    to: (rooms: string | string[]) => ({
      emit: (event: string, payload: unknown) =>
        sent.push({ rooms, event, payload }),
    }),
  };

  setupOrchestratorEventBridge({
    chatOrchestrator: orchestrator as unknown as ChatOrchestrator,
    io: io as unknown as Server,
    metricsService: {} as MetricsService,
    previewRoomId: PREVIEW_ROOM,
    onBroadcast: async () => {},
  });

  return { orchestrator, sent };
};

const status = (overrides: Partial<RoomAIStatus>): RoomAIStatus => ({
  roomId: "default",
  messageCount: 0,
  maxMessages: 10,
  remaining: 10,
  isAsleep: false,
  sleepReason: null,
  lastHumanMessageAt: null,
  lastAIMessageAt: null,
  ...overrides,
});

describe("AI status bridge", () => {
  it("tells the main room and its guests how many AI replies are left", () => {
    const { orchestrator, sent } = makeBridge();

    orchestrator.emit(
      "ai-status-changed",
      status({ messageCount: 10, remaining: 0, isAsleep: true, sleepReason: "message-limit-reached" }),
    );

    expect(sent).toEqual([
      {
        rooms: ["default", PREVIEW_ROOM],
        event: SOCKET_EVENTS.AI_STATUS_CHANGED,
        payload: {
          roomId: "default",
          status: "sleeping",
          reason: "message-limit-reached",
          remaining: 0,
          maxMessages: 10,
          messageCount: 10,
        },
      },
    ]);
  });

  it("keeps a private room's budget to that room", () => {
    const { orchestrator, sent } = makeBridge();

    orchestrator.emit(
      "ai-status-changed",
      status({ roomId: "private:ada:claude", messageCount: 1, remaining: 9 }),
    );

    expect(sent).toHaveLength(1);
    expect(sent[0].rooms).toEqual(["private:ada:claude"]);
    expect(sent[0].payload).toMatchObject({ status: "active", remaining: 9 });
    expect(sent[0].payload).not.toHaveProperty("reason");
  });
});

import { describe, expect, it } from "bun:test";
import type { Socket } from "socket.io";
import { SOCKET_EVENTS } from "@ai-chat/ai-configs";

import { CLEAR_ROOM_COOLDOWN_MS } from "@/config/serverConfig.js";
import { RateLimiter } from "@/services/RateLimiter.js";
import type { SocketHandlerContext } from "./socketHandlerContext.js";
import {
  handleClearRoom,
  handleGetLastPrompt,
} from "./socketCommandHandlers.js";

const PREVIEW_ROOM = "preview-default-room";
const PRIVATE_ROOM = "private:ada:claude";

type Emitted = { rooms: string | string[]; event: string; payload: unknown };

/**
 * Enough of the handler context for the slash commands: records what the
 * orchestrator and history are asked to clear, and what goes to which room.
 */
const makeContext = (roomId = "default") => {
  const clearedRooms: string[] = [];
  const clearedHistory: string[] = [];
  const broadcasts: Emitted[] = [];
  const context = {
    connectedUsers: new Map([
      ["socket-1", { username: "Ada", roomId, joinedAt: 0 }],
    ]),
    clearRoomLimiter: new RateLimiter({
      windowMs: CLEAR_ROOM_COOLDOWN_MS,
      maxMessages: 1,
    }),
    chatOrchestrator: {
      clearRoom: (room: string) => clearedRooms.push(room),
      getLatestPrompt: (room: string) =>
        room === "default"
          ? {
              roomId: room,
              aiId: "claude",
              aiName: "Claude",
              reply: "Hi Ada.",
              messages: [{ role: "system", content: "Be brief." }],
              createdAt: 1,
            }
          : null,
    },
    messageHistory: {
      clearRoom: async (room: string) => {
        clearedHistory.push(room);
      },
    },
    previewRoomId: PREVIEW_ROOM,
    io: {
      to: (rooms: string | string[]) => ({
        emit: (event: string, payload: unknown) =>
          broadcasts.push({ rooms, event, payload }),
      }),
    },
  } as unknown as SocketHandlerContext;

  return { context, clearedRooms, clearedHistory, broadcasts };
};

const makeSocket = (id = "socket-1") => {
  const sent: { event: string; payload: unknown }[] = [];
  const socket = {
    id,
    emit: (event: string, payload: unknown) => sent.push({ event, payload }),
  } as unknown as Socket;
  return { socket, sent };
};

describe("handleClearRoom", () => {
  it("clears the room's context and history and tells everyone who did it", async () => {
    const { context, clearedRooms, clearedHistory, broadcasts } = makeContext();
    const { socket, sent } = makeSocket();

    await handleClearRoom(context, socket);

    expect(clearedRooms).toEqual(["default"]);
    expect(clearedHistory).toEqual(["default"]);
    expect(sent).toEqual([]);
    expect(broadcasts).toHaveLength(1);
    // Guests reading the main room through the preview are told too
    expect(broadcasts[0]).toMatchObject({
      rooms: ["default", PREVIEW_ROOM],
      event: SOCKET_EVENTS.ROOM_CLEARED,
      payload: { roomId: "default", by: "Ada" },
    });
  });

  it("keeps a private room's clear out of the preview", async () => {
    const { context, broadcasts } = makeContext(PRIVATE_ROOM);

    await handleClearRoom(context, makeSocket().socket);

    expect(broadcasts[0].rooms).toEqual([PRIVATE_ROOM]);
  });

  it("refuses a second clear in the same room during the cooldown", async () => {
    const { context, clearedRooms } = makeContext();
    const { socket, sent } = makeSocket();

    await handleClearRoom(context, socket);
    await handleClearRoom(context, socket);

    expect(clearedRooms).toEqual(["default"]);
    expect(sent).toHaveLength(1);
    expect(sent[0].event).toBe(SOCKET_EVENTS.ERROR);
    expect((sent[0].payload as { message: string }).message).toMatch(
      /cleared moments ago/,
    );
  });

  it("ignores a socket that hasn't joined a room", async () => {
    const { context, clearedRooms } = makeContext();
    const { socket, sent } = makeSocket("stranger");

    await handleClearRoom(context, socket);

    expect(clearedRooms).toEqual([]);
    expect(sent[0].event).toBe(SOCKET_EVENTS.ERROR);
  });
});

describe("handleGetLastPrompt", () => {
  it("sends the room's latest prompt to the asker only", () => {
    const { context, broadcasts } = makeContext();
    const { socket, sent } = makeSocket();

    handleGetLastPrompt(context, socket);

    expect(broadcasts).toEqual([]);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      event: SOCKET_EVENTS.LAST_PROMPT,
      payload: {
        roomId: "default",
        prompt: { aiName: "Claude", reply: "Hi Ada." },
      },
    });
  });

  it("answers with no prompt when none is on record", () => {
    const { context } = makeContext(PRIVATE_ROOM);
    const { socket, sent } = makeSocket();

    handleGetLastPrompt(context, socket);

    expect(sent[0].payload).toEqual({ roomId: PRIVATE_ROOM, prompt: null });
  });
});

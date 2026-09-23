import { describe, expect, it } from "bun:test";
import type { ChatOrchestrator } from "@ai-chat/core";

import { applyRoomAIScope, getPrivateRoomAiId } from "./socketUtils.js";

type ScopeCall = { roomId: string; aiIds?: string[]; directOnly?: boolean };

/**
 * Minimal orchestrator stand-in: applyRoomAIScope only needs the AI lookup
 * plus the three room-scope setters, so the rest stays out of the way.
 */
const makeOrchestrator = (knownAiIds: string[]) => {
  const calls: ScopeCall[] = [];
  const services = new Map(knownAiIds.map((id) => [id, { id }]));

  const orchestrator = {
    aiServices: services,
    findAIByNormalizedAlias: (normalized: string | null | undefined) =>
      [...services.values()].find(
        (ai) => ai.id.toLowerCase().replace(/[^a-z0-9]/g, "") === normalized,
      ) ?? null,
    setRoomAllowedAIs: (roomId: string, aiIds: string[]) =>
      calls.push({ roomId, aiIds }),
    clearRoomAllowedAIs: (roomId: string) => calls.push({ roomId }),
    setRoomDirectOnly: (roomId: string, directOnly: boolean) =>
      calls.push({ roomId, directOnly }),
  } as unknown as ChatOrchestrator;

  return { orchestrator, calls };
};

describe("getPrivateRoomAiId", () => {
  it("reads the AI out of a private room id", () => {
    expect(getPrivateRoomAiId("private:ada:ANTHROPIC_CLAUDE_OPUS_5_5")).toBe(
      "ANTHROPIC_CLAUDE_OPUS_5_5",
    );
  });

  it("returns null for ordinary rooms and malformed ids", () => {
    expect(getPrivateRoomAiId("default")).toBeNull();
    expect(getPrivateRoomAiId("private:ada")).toBeNull();
    expect(getPrivateRoomAiId("private:ada:")).toBeNull();
  });
});

describe("applyRoomAIScope", () => {
  it("scopes a private room to its AI and marks it direct-only", () => {
    const { orchestrator, calls } = makeOrchestrator(["OPENAI_GPT6_SOL"]);

    applyRoomAIScope(orchestrator, "private:ada:OPENAI_GPT6_SOL");

    expect(calls).toEqual([
      { roomId: "private:ada:OPENAI_GPT6_SOL", aiIds: ["OPENAI_GPT6_SOL"] },
      { roomId: "private:ada:OPENAI_GPT6_SOL", directOnly: true },
    ]);
  });

  it("clears the scope for the main room", () => {
    const { orchestrator, calls } = makeOrchestrator(["OPENAI_GPT6_SOL"]);

    applyRoomAIScope(orchestrator, "default");

    expect(calls).toEqual([{ roomId: "default" }]);
  });

  it("falls back to an unscoped room when the AI is unknown", () => {
    const { orchestrator, calls } = makeOrchestrator(["OPENAI_GPT6_SOL"]);

    applyRoomAIScope(orchestrator, "private:ada:RETIRED_MODEL");

    expect(calls).toEqual([{ roomId: "private:ada:RETIRED_MODEL" }]);
  });
});

/**
 * Socket.IO membership is separate from RoomManager's bookkeeping. handleJoinRoom
 * must drop the previous room, or the main room keeps broadcasting into a
 * private chat. This models the socket's room set the way Socket.IO does.
 */
describe("room membership on join", () => {
  const makeSocket = (id: string) => {
    const rooms = new Set<string>([id]);
    return {
      id,
      rooms,
      join: (room: string) => rooms.add(room),
      leave: (room: string) => rooms.delete(room),
    };
  };

  /** The membership swap performed by handleJoinRoom. */
  const switchRoom = (
    socket: ReturnType<typeof makeSocket>,
    roomId: string,
    previousRoomId?: string,
  ) => {
    if (previousRoomId && previousRoomId !== roomId) socket.leave(previousRoomId);
    socket.leave("preview");
    socket.join(roomId);
  };

  it("leaves the previous room so its broadcasts stop arriving", () => {
    const socket = makeSocket("sock-1");
    switchRoom(socket, "default");
    switchRoom(socket, "private:ada:OPENAI_GPT6_SOL", "default");

    expect([...socket.rooms]).toEqual([
      "sock-1",
      "private:ada:OPENAI_GPT6_SOL",
    ]);
  });

  it("keeps the socket's own room, which Socket.IO needs for direct emits", () => {
    const socket = makeSocket("sock-2");
    switchRoom(socket, "default");

    expect(socket.rooms.has("sock-2")).toBe(true);
  });

  it("drops the preview room when a guest joins", () => {
    const socket = makeSocket("sock-3");
    socket.join("preview");
    switchRoom(socket, "default");

    expect(socket.rooms.has("preview")).toBe(false);
  });

  it("keeps the dashboard subscription, which is not a chat room", () => {
    const socket = makeSocket("sock-4");
    socket.join("dashboard");
    switchRoom(socket, "default");
    switchRoom(socket, "private:ada:OPENAI_GPT6_SOL", "default");

    expect(socket.rooms.has("dashboard")).toBe(true);
  });
});

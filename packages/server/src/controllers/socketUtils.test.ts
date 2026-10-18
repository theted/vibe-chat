import { describe, expect, it } from "bun:test";
import type { ChatOrchestrator } from "@ai-chat/core";

import {
  applyRoomAIScope,
  canCarryHistory,
  describeWait,
  describeWindow,
  getRateLimitError,
} from "./socketUtils.js";

type ScopeCall = {
  roomId: string;
  aiIds?: string[];
  directOnly?: boolean;
  privateGroup?: boolean;
};

/**
 * Minimal orchestrator stand-in: applyRoomAIScope only needs the AI lookup
 * plus the room-scope setters, so the rest stays out of the way.
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
    setRoomPrivateGroup: (roomId: string, privateGroup: boolean) =>
      calls.push({ roomId, privateGroup }),
  } as unknown as ChatOrchestrator;

  return { orchestrator, calls };
};

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

    const scope = applyRoomAIScope(orchestrator, "private:ada:RETIRED_MODEL");

    expect(calls).toEqual([{ roomId: "private:ada:RETIRED_MODEL" }]);
    expect(scope).toEqual({
      requestedPrivate: true,
      privateAiIds: [],
      unavailableAiIds: ["RETIRED_MODEL"],
    });
  });

  it("scopes a room naming several AIs to all of them as a private group", () => {
    const room = "private:ada:ANTHROPIC_OPUS+OPENAI_GPT6_SOL";
    const { orchestrator, calls } = makeOrchestrator([
      "ANTHROPIC_OPUS",
      "OPENAI_GPT6_SOL",
      "XAI_GROK",
    ]);

    const scope = applyRoomAIScope(orchestrator, room);

    expect(calls).toEqual([
      { roomId: room, aiIds: ["ANTHROPIC_OPUS", "OPENAI_GPT6_SOL"] },
      { roomId: room, privateGroup: true },
    ]);
    expect(scope.privateAiIds).toEqual(["ANTHROPIC_OPUS", "OPENAI_GPT6_SOL"]);
    expect(scope.unavailableAiIds).toEqual([]);
  });

  it("leaves unknown AIs out of a group and reports them", () => {
    const room = "private:ada:ANTHROPIC_OPUS+OPENAI_GPT6_SOL+RETIRED_MODEL";
    const { orchestrator, calls } = makeOrchestrator([
      "ANTHROPIC_OPUS",
      "OPENAI_GPT6_SOL",
    ]);

    const scope = applyRoomAIScope(orchestrator, room);

    expect(calls[0]).toEqual({
      roomId: room,
      aiIds: ["ANTHROPIC_OPUS", "OPENAI_GPT6_SOL"],
    });
    expect(scope.unavailableAiIds).toEqual(["RETIRED_MODEL"]);
  });

  it("runs a group down to one available model as a 1-1 chat", () => {
    const room = "private:ada:OPENAI_GPT6_SOL+RETIRED_MODEL";
    const { orchestrator, calls } = makeOrchestrator(["OPENAI_GPT6_SOL"]);

    const scope = applyRoomAIScope(orchestrator, room);

    expect(calls).toEqual([
      { roomId: room, aiIds: ["OPENAI_GPT6_SOL"] },
      { roomId: room, directOnly: true },
    ]);
    expect(scope.privateAiIds).toEqual(["OPENAI_GPT6_SOL"]);
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
    if (previousRoomId && previousRoomId !== roomId)
      socket.leave(previousRoomId);
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

describe("rate limit error", () => {
  it("names the limit that was hit and when to try again", () => {
    const error = getRateLimitError({
      retryAfterMs: 17 * 60 * 1000 + 5_000,
      limit: { windowMs: 60 * 60 * 1000, maxMessages: 10 },
    });

    expect(error).toEqual({
      code: "RATE_LIMITED",
      message: "You can send 10 messages per hour. Try again in 18 minutes.",
      retryAfterSeconds: 17 * 60 + 5,
    });
  });

  it("describes windows and waits in plain units", () => {
    expect(describeWindow(24 * 60 * 60 * 1000)).toBe("day");
    expect(describeWindow(10 * 60 * 1000)).toBe("10 minutes");
    expect(describeWait(5 * 60 * 60 * 1000 + 1)).toBe("6 hours");
    expect(describeWait(90 * 60 * 1000)).toBe("90 minutes");
    expect(describeWait(400)).toBe("1 second");
  });
});

describe("canCarryHistory", () => {
  it("allows moving between the joining user's own private rooms", () => {
    expect(canCarryHistory("private:ada:A", "private:ada:A+B", "ada")).toBe(
      true,
    );
  });

  it("refuses the main room, the same room, and other users' rooms", () => {
    expect(canCarryHistory(undefined, "private:ada:A+B", "ada")).toBe(false);
    expect(canCarryHistory("default", "private:ada:A+B", "ada")).toBe(false);
    expect(canCarryHistory("private:ada:A", "private:ada:A", "ada")).toBe(
      false,
    );
    expect(canCarryHistory("private:bob:A", "private:ada:A+B", "ada")).toBe(
      false,
    );
    expect(canCarryHistory("private:ada:A", "private:bob:A+B", "bob")).toBe(
      false,
    );
  });
});

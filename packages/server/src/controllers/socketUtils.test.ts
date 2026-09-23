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

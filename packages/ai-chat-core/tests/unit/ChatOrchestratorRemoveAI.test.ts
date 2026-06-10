import { describe, expect, it } from "bun:test";
import { ChatOrchestrator } from "@ai-chat/core";

const addStubAI = (orchestrator: ChatOrchestrator, aiId: string): void => {
  orchestrator.aiServices.set(aiId, {
    id: aiId,
    name: aiId,
    displayName: aiId,
    alias: aiId.toLowerCase(),
    normalizedAlias: aiId.toLowerCase(),
    emoji: "🤖",
    isActive: true,
    lastMessageTime: 0,
  } as never);
  orchestrator.activeAIs.push(aiId);
};

describe("ChatOrchestrator.removeAI", () => {
  it("removes the service and its active entry", () => {
    const orchestrator = new ChatOrchestrator();
    orchestrator.cleanup();
    addStubAI(orchestrator, "TEST_MODEL_A");
    addStubAI(orchestrator, "TEST_MODEL_B");

    expect(orchestrator.removeAI("TEST_MODEL_A")).toBe(true);
    expect(orchestrator.aiServices.has("TEST_MODEL_A")).toBe(false);
    expect(orchestrator.activeAIs).toEqual(["TEST_MODEL_B"]);
  });

  it("returns false for unknown ids without touching state", () => {
    const orchestrator = new ChatOrchestrator();
    orchestrator.cleanup();
    addStubAI(orchestrator, "TEST_MODEL_A");

    expect(orchestrator.removeAI("NOPE")).toBe(false);
    expect(orchestrator.aiServices.has("TEST_MODEL_A")).toBe(true);
    expect(orchestrator.activeAIs).toEqual(["TEST_MODEL_A"]);
  });
});

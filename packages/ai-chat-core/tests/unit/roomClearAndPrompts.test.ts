/**
 * /clear and /debug as the orchestrator sees them: clearing one room's
 * conversation, the prompt log behind each AI's latest reply, and a reply
 * that was still being written when its room was cleared.
 */

import { afterEach, describe, expect, it } from "bun:test";
import { ChatOrchestrator } from "@/orchestrator/ChatOrchestrator.js";
import { ContextManager } from "@/orchestrator/ContextManager.js";
import { PromptLog, type PromptRecord } from "@/orchestrator/PromptLog.js";
import type { IAIService } from "@/types/index.js";
import type { ContextMessage } from "@/types/orchestrator.js";

const MAIN_ROOM = "default";
const PRIVATE_ROOM = "private:ada:TEST_AI";
// The broker hands queued messages on after a short processing delay
const BROKER_SETTLE_MS = 50;

const settle = () =>
  new Promise((resolve) => setTimeout(resolve, BROKER_SETTLE_MS));

const userMessage = (content: string, roomId = MAIN_ROOM): ContextMessage => ({
  sender: "Ada",
  senderType: "user",
  content,
  roomId,
  // Keeps handleMessage from scheduling replies; tests generate them directly
  suppressAIResponses: true,
});

const promptRecord = (
  roomId: string,
  aiId: string,
  reply = "hi",
): PromptRecord => ({
  roomId,
  aiId,
  aiName: aiId,
  reply,
  messages: [{ role: "system", content: "be nice" }],
  createdAt: Date.now(),
});

describe("ContextManager.clearRoom", () => {
  it("forgets one room's messages and leaves the others", () => {
    const manager = new ContextManager();
    manager.addMessage(userMessage("main hello"));
    manager.addMessage(userMessage("private hello", PRIVATE_ROOM));

    const before = Date.now();
    manager.clearRoom(MAIN_ROOM);

    expect(manager.getContext(50, MAIN_ROOM)).toEqual([]);
    expect(
      manager.getContext(50, PRIVATE_ROOM).map(({ content }) => content),
    ).toEqual(["private hello"]);
    expect(manager.wasClearedSince(MAIN_ROOM, before)).toBe(true);
    expect(manager.wasClearedSince(PRIVATE_ROOM, before)).toBe(false);
  });
});

describe("PromptLog", () => {
  it("keeps the latest record per room and AI", () => {
    const log = new PromptLog();
    log.record(promptRecord(MAIN_ROOM, "A", "first"));
    log.record(promptRecord(MAIN_ROOM, "A", "second"));

    expect(log.get(MAIN_ROOM, "A")?.reply).toBe("second");
    expect(log.get(PRIVATE_ROOM, "A")).toBeUndefined();
  });

  it("drops the least recently written record past its limit", () => {
    const log = new PromptLog(2);
    log.record(promptRecord(MAIN_ROOM, "A"));
    log.record(promptRecord(MAIN_ROOM, "B"));
    log.record(promptRecord(MAIN_ROOM, "A"));
    log.record(promptRecord(MAIN_ROOM, "C"));

    expect(log.get(MAIN_ROOM, "B")).toBeUndefined();
    expect(log.get(MAIN_ROOM, "A")).toBeDefined();
    expect(log.get(MAIN_ROOM, "C")).toBeDefined();
  });

  it("clears one room's records", () => {
    const log = new PromptLog();
    log.record(promptRecord(MAIN_ROOM, "A"));
    log.record(promptRecord(PRIVATE_ROOM, "A"));

    log.clearRoom(MAIN_ROOM);

    expect(log.get(MAIN_ROOM, "A")).toBeUndefined();
    expect(log.get(PRIVATE_ROOM, "A")).toBeDefined();
  });
});

describe("ChatOrchestrator room clearing and prompts", () => {
  let orchestrator: ChatOrchestrator;

  /** One fake AI whose reply resolves when the test says so. */
  const setup = () => {
    orchestrator = new ChatOrchestrator();
    orchestrator.stopBackgroundConversation();
    let reply = "Hello Ada.";
    let gate: Promise<void> | null = null;
    const service = {
      generateResponse: async () => {
        if (gate) await gate;
        return reply;
      },
      getModel: () => "test-model-1",
    } as unknown as IAIService;
    orchestrator.aiServices.set("TEST_AI", {
      id: "TEST_AI",
      name: "Test AI",
      displayName: "Test AI",
      alias: "test-ai",
      normalizedAlias: "testai",
      isActive: true,
      service,
    });
    orchestrator.activeAIs.push("TEST_AI");
    return {
      setReply: (text: string) => {
        reply = text;
      },
      /** Make replies wait; returns the function that lets them go. */
      holdReplies: () => {
        let open: () => void = () => undefined;
        gate = new Promise<void>((resolve) => {
          open = resolve;
        });
        return () => open();
      },
    };
  };

  afterEach(() => orchestrator?.cleanup());

  it("finds the prompt behind the newest AI reply, skipping @Chat", async () => {
    setup();
    await orchestrator.handleMessage(userMessage("What's new?"));
    await orchestrator.generateAIResponse("TEST_AI", MAIN_ROOM);
    await settle();
    // @Chat's answers come from the agent, so they have no prompt on record
    await orchestrator.handleMessage({
      sender: "@Chat",
      senderType: "ai",
      aiId: "chat-assistant",
      content: "Nothing much.",
      roomId: MAIN_ROOM,
    });

    const record = orchestrator.getLatestPrompt(MAIN_ROOM);

    expect(record).toMatchObject({
      aiId: "TEST_AI",
      aiName: "Test AI",
      modelId: "test-model-1",
      reply: "Hello Ada.",
    });
    expect(record?.messages[0].role).toBe("system");
    expect(
      record?.messages.some(({ content }) => content.includes("What's new?")),
    ).toBe(true);
  });

  it("returns null when no reply in the room has a prompt on record", () => {
    setup();
    expect(orchestrator.getLatestPrompt(MAIN_ROOM)).toBeNull();
  });

  it("forgets a cleared room's conversation and prompts", async () => {
    setup();
    await orchestrator.handleMessage(userMessage("What's new?"));
    await orchestrator.generateAIResponse("TEST_AI", MAIN_ROOM);
    await settle();
    orchestrator.lastAIMessageTime = Date.now();

    orchestrator.clearRoom(MAIN_ROOM);

    expect(orchestrator.contextManager.getContext(50, MAIN_ROOM)).toEqual([]);
    expect(orchestrator.getLatestPrompt(MAIN_ROOM)).toBeNull();
    // Background chatter waits for someone to post in the empty room
    expect(orchestrator.lastAIMessageTime).toBe(0);
  });

  it("drops a reply that was being written when the room was cleared", async () => {
    const { holdReplies, setReply } = setup();
    await orchestrator.handleMessage(
      userMessage("Tell me about the old topic"),
    );
    setReply("About the old topic...");
    const releaseReply = holdReplies();

    const generating = orchestrator.generateAIResponse("TEST_AI", MAIN_ROOM);
    orchestrator.clearRoom(MAIN_ROOM);
    releaseReply();
    await generating;
    await settle();

    expect(orchestrator.contextManager.getContext(50, MAIN_ROOM)).toEqual([]);
    expect(orchestrator.getLatestPrompt(MAIN_ROOM)).toBeNull();
  });
});

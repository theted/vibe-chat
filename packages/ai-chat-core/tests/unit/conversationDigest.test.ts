import { describe, it, expect } from "bun:test";
import { ContextManager } from "@/orchestrator/ContextManager.js";
import { CONVERSATION_DIGEST } from "@/orchestrator/constants.js";
import { createEnhancedSystemPrompt } from "@/utils/orchestrator/promptBuilder.js";

const makeMessage = (index: number, sender = `User${index}`) => ({
  sender,
  displayName: sender,
  content: `Message number ${index} about a memorable topic`,
  senderType: "user" as const,
});

describe("ContextManager conversation digest", () => {
  it("is empty until the window overflows", () => {
    const manager = new ContextManager(5);
    for (let i = 0; i < 5; i++) manager.addMessage(makeMessage(i));

    expect(manager.getConversationDigest()).toBe("");
  });

  it("folds evicted messages into the digest, oldest first", () => {
    const manager = new ContextManager(3);
    for (let i = 0; i < 5; i++) manager.addMessage(makeMessage(i));

    const digest = manager.getConversationDigest();
    const lines = digest.split("\n");

    // 5 messages through a 3-message window evicts messages 0 and 1
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe("User0: Message number 0 about a memorable topic");
    expect(lines[1]).toContain("Message number 1");
    expect(manager.size()).toBe(3);
  });

  it("truncates long messages to the digest excerpt length", () => {
    const manager = new ContextManager(1);
    manager.addMessage({
      sender: "Alice",
      displayName: "Alice",
      content: "x".repeat(500),
      senderType: "user" as const,
    });
    manager.addMessage(makeMessage(1));

    const [line] = manager.getConversationDigest().split("\n");
    // "Alice: " prefix + excerpt capped at EXCERPT_LENGTH (incl. ellipsis)
    expect(line.length).toBeLessThanOrEqual(
      "Alice: ".length + CONVERSATION_DIGEST.EXCERPT_LENGTH,
    );
    expect(line.endsWith("…")).toBeTrue();
  });

  it("caps the digest at MAX_ENTRIES, dropping the oldest lines", () => {
    const manager = new ContextManager(1);
    const total = CONVERSATION_DIGEST.MAX_ENTRIES + 10;
    for (let i = 0; i <= total; i++) manager.addMessage(makeMessage(i));

    const lines = manager.getConversationDigest().split("\n");
    expect(lines).toHaveLength(CONVERSATION_DIGEST.MAX_ENTRIES);
    // The 10 oldest evicted messages (0..9) have been dropped
    expect(lines[0]).toContain("Message number 10");
  });

  it("clears the digest together with the context", () => {
    const manager = new ContextManager(1);
    manager.addMessage(makeMessage(0));
    manager.addMessage(makeMessage(1));
    expect(manager.getConversationDigest()).not.toBe("");

    manager.clear();
    expect(manager.getConversationDigest()).toBe("");
  });
});

describe("system prompt digest injection", () => {
  const aiService = {
    id: "test_ai",
    name: "TestAI",
    displayName: "TestAI",
    alias: "testai",
    normalizedAlias: "testai",
  };
  const aiServices = new Map([[aiService.id, aiService]]);

  it("includes the digest section when a digest exists", () => {
    const prompt = createEnhancedSystemPrompt(
      aiService,
      [],
      true,
      aiServices,
      "Alice: something said long ago",
    );

    expect(prompt).toContain("Earlier in this conversation");
    expect(prompt).toContain("Alice: something said long ago");
  });

  it("omits the digest section when the digest is empty", () => {
    const prompt = createEnhancedSystemPrompt(aiService, [], true, aiServices);

    expect(prompt).not.toContain("Earlier in this conversation");
  });
});

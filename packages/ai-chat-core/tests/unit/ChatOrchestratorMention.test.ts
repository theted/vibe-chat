import { afterEach, describe, it, expect } from "bun:test";
import { ChatOrchestrator } from "@ai-chat/core";

describe("ChatOrchestrator user mention behavior", () => {
  let orchestrator: ChatOrchestrator | null = null;

  afterEach(() => {
    if (orchestrator) {
      orchestrator.cleanup();
      orchestrator = null;
    }
  });

  it("marks the active user as the mention target when responding", () => {
    orchestrator = new ChatOrchestrator({
      minBackgroundDelay: 1_000_000,
      maxBackgroundDelay: 1_000_000,
    });

    const aiService = {
      id: "anthropic_claude",
      name: "Claude",
      displayName: "Claude",
      alias: "claude",
      normalizedAlias: "claude",
    };

    const context = [
      {
        senderType: "user",
        sender: "Bob",
        displayName: "Bob",
        alias: "Bob",
        normalizedAlias: "bob",
        content: "@claude what do you think about this?",
        mentionsNormalized: ["claude"],
      },
    ];

    const strategy = orchestrator.determineInteractionStrategy(
      aiService,
      context,
      true,
    );

    expect(strategy.shouldMention).toBe(true);
    expect(strategy.targetAI).toBeTruthy();
    expect(strategy.targetAI.type).toBe("user");
    expect(strategy.targetAI.alias).toBe("Bob");
    expect(strategy.targetAI.displayName).toBe("Bob");
  });

  it("injects a user @mention preserving the original casing", () => {
    orchestrator = new ChatOrchestrator({
      minBackgroundDelay: 1_000_000,
      maxBackgroundDelay: 1_000_000,
    });

    const message = "Thanks for the question!";
    const mentionTarget = {
      type: "user",
      alias: "Bob",
      displayName: "Bob",
    } as const;
    // @ai-chat/core types only accept a string target today; runtime supports object mention targets.
    const updated = orchestrator.addMentionToResponse(
      message,
      mentionTarget as unknown as string,
    );

    expect(updated).not.toBe(message);
    expect(updated.includes("@Bob")).toBeTruthy();
    expect(!updated.includes("@bob")).toBeTruthy();
  });

  it("limits unique @mentions to two per response", () => {
    orchestrator = new ChatOrchestrator({
      minBackgroundDelay: 1_000_000,
      maxBackgroundDelay: 1_000_000,
    });

    const message = "@Claude and @GPT should weigh in, plus @Gemini too.";
    const updated = orchestrator.limitMentionsInResponse(message);

    expect(updated).toBe(
      "@Claude and @GPT should weigh in, plus Gemini too.",
    );
  });
});

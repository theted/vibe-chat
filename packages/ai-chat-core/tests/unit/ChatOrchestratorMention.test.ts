import { afterEach, describe, it, expect } from "bun:test";
import { ChatOrchestrator } from "@ai-chat/core";
import { applyInteractionStrategy } from "@/utils/orchestrator/strategyUtils.js";

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
    // Prompt-driven mentions: the literal handle preserves original casing
    expect(strategy.mentionHandle).toBe("@Bob");
  });

  it("injects a mention instruction into the context instead of templating", () => {
    const aiService = {
      id: "anthropic_claude",
      name: "Claude",
      displayName: "Claude",
      alias: "claude",
      normalizedAlias: "claude",
    };
    const strategy = {
      type: "direct",
      shouldMention: true,
      targetAI: { type: "user", alias: "Bob", displayName: "Bob" },
      mentionHandle: "@Bob",
      energy: "normal",
      windingDown: false,
    };

    const enhanced = applyInteractionStrategy([], strategy, aiService, null);
    const instruction = enhanced[enhanced.length - 1];

    expect(instruction.senderType).toBe("system");
    expect(instruction.content).toContain("@Bob");
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

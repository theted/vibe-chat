import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
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

    assert.equal(strategy.shouldMention, true);
    assert.ok(strategy.targetAI, "expected a mention target");
    assert.equal(strategy.targetAI.type, "user");
    assert.equal(strategy.targetAI.alias, "Bob");
    assert.equal(strategy.targetAI.displayName, "Bob");
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

    assert.notEqual(updated, message, "mention should modify the message");
    assert.ok(
      updated.includes("@Bob"),
      "mention should include the user's name",
    );
    assert.ok(!updated.includes("@bob"), "mention should preserve casing");
  });
});

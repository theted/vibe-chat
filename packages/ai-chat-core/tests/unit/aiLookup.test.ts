import { describe, it, expect } from "bun:test";
import { findAIFromContextMessage } from "@/utils/orchestrator/aiLookup.js";

describe("findAIFromContextMessage", () => {
  it("prefers provider/model metadata over display name collisions", () => {
    const aiServices = new Map(
      [
        [
          "ANTHROPIC_CLAUDE_3_5_HAIKU",
          {
            id: "ANTHROPIC_CLAUDE_3_5_HAIKU",
            displayName: "Claude 3.5 Haiku",
            alias: "claude-3-5-haiku",
            normalizedAlias: "claude35haiku",
            config: { providerKey: "ANTHROPIC", modelKey: "claude-3-5-haiku" },
          },
        ],
        [
          "ANTHROPIC_CLAUDE_3_5_HAIKU_20241022",
          {
            id: "ANTHROPIC_CLAUDE_3_5_HAIKU_20241022",
            displayName: "Claude 3.5 Haiku",
            alias: "haiku-3-5",
            normalizedAlias: "haiku35",
            config: { providerKey: "ANTHROPIC", modelKey: "haiku-3-5" },
          },
        ],
      ],
    );

    const message = {
      senderType: "ai",
      displayName: "Claude 3.5 Haiku",
      providerKey: "ANTHROPIC",
      modelKey: "haiku-3-5",
    };

    const resolved = findAIFromContextMessage(aiServices, message);

    expect(resolved?.id).toBe("ANTHROPIC_CLAUDE_3_5_HAIKU_20241022");
  });
});

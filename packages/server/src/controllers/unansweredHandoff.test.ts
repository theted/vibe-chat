import { describe, expect, it } from "bun:test";
import type { UnansweredMessage } from "@ai-chat/core";

import { buildHandoffText } from "./unansweredHandoff.js";

const event = (overrides: Partial<UnansweredMessage>): UnansweredMessage => ({
  roomId: "default",
  message: { id: "m1", content: "hello?", senderType: "user" },
  reason: "no-takers",
  silentAIIds: [],
  handoffAIId: "gpt",
  ...overrides,
});

describe("buildHandoffText", () => {
  it("passes a mention whose AIs never answered to another AI, naming them without @", () => {
    const text = buildHandoffText(
      event({ reason: "mention-unanswered", silentAIIds: ["claude", "grok"] }),
      { asker: "Ada", silentNames: ["Claude", "Grok"], handoffHandle: "gpt" },
    );
    expect(text).toBe(
      "Claude and Grok didn't get to Ada's message, so I'm passing it to @gpt.",
    );
  });

  it("asks one AI to pick up a broad question nobody took", () => {
    expect(
      buildHandoffText(event({}), {
        asker: "Ada",
        silentNames: [],
        handoffHandle: "gemini",
      }),
    ).toBe(
      "Nobody has picked up Ada's message yet. @gemini, could you take it?",
    );
  });

  it("routes a near-miss handle to the AI it most likely meant", () => {
    const text = buildHandoffText(
      event({
        reason: "near-miss-handle",
        nearMiss: { token: "gpt-6-2-astr", suggestion: "gpt-6-2-astra" },
      }),
      { asker: "Ada", silentNames: [], handoffHandle: "gpt-6-2-astra" },
    );
    expect(text).toBe(
      "Nobody here goes by gpt-6-2-astr, so I'm passing Ada's message to @gpt-6-2-astra.",
    );
    // The near miss itself carries no "@", so it can't be parsed as a mention
    expect(text.match(/@/g)).toHaveLength(1);
  });

  it("retries the only AI in a 1-1 chat after it timed out", () => {
    const text = buildHandoffText(
      event({
        reason: "mention-unanswered",
        silentAIIds: ["claude"],
        handoffAIId: "claude",
      }),
      { asker: "Ada", silentNames: ["Claude"], handoffHandle: "claude" },
    );
    expect(text).toBe("@claude, Ada's message is still waiting for an answer.");
  });

  it("says so when no AI is free", () => {
    expect(
      buildHandoffText(event({ handoffAIId: null }), {
        asker: null,
        silentNames: [],
        handoffHandle: null,
      }),
    ).toBe(
      "someone, nobody has answered yet and no model here is free right now. Try again in a little while.",
    );
  });
});

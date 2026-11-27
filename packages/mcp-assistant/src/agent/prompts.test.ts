import { describe, expect, it } from "bun:test";
import { buildQuestionMessage } from "./prompts.js";

// Friday 2026-11-27 20:15 UTC
const NOW = Date.UTC(2026, 10, 27, 20, 15);

describe("buildQuestionMessage", () => {
  it("states the current time and each recent message's send time", () => {
    const message = buildQuestionMessage({
      question: "When did Ada ask?",
      askedBy: "Claude",
      now: NOW,
      history: [
        {
          sender: "Ada",
          senderType: "user",
          content: "How do rooms work?",
          timestamp: Date.UTC(2026, 10, 27, 9, 2),
        },
        { sender: "GPT", senderType: "ai", content: "No time on this one." },
      ],
    });

    expect(message).toStartWith(
      "<current_time>2026-11-27 20:15 UTC</current_time>",
    );
    expect(message).toContain(
      "[2026-11-27 09:02 UTC] Ada (human): How do rooms work?",
    );
    expect(message).toContain("\nGPT (AI): No time on this one.");
    expect(message).toEndWith(
      '<question from="Claude">\nWhen did Ada ask?\n</question>',
    );
  });
});

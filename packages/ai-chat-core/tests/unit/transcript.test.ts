/**
 * What a model actually sees: who said what, and who it is answering.
 */

import { describe, expect, it } from "bun:test";
import type { ContextMessage } from "@/types/orchestrator.js";
import {
  findAIFromContextMessage,
  getMentionTokenForAI,
} from "@/utils/orchestrator/aiLookup.js";
import { limitMentionsInResponse } from "@/utils/orchestrator/mentionUtils.js";
import {
  buildTurnInstruction,
  determineInteractionStrategy,
} from "@/utils/orchestrator/strategyUtils.js";
import {
  buildTranscript,
  stripOwnSpeakerLabel,
} from "@/utils/orchestrator/transcript.js";

const claude = {
  id: "anthropic_claude",
  name: "Claude",
  displayName: "Claude",
  alias: "claude",
  normalizedAlias: "claude",
};
const gpt = {
  id: "openai_gpt",
  name: "GPT",
  displayName: "GPT",
  alias: "gpt",
  normalizedAlias: "gpt",
};
const gemini = {
  id: "google_gemini",
  name: "Gemini",
  displayName: "Gemini",
  alias: "gemini",
  normalizedAlias: "gemini",
};
const aiServices = new Map([claude, gpt, gemini].map((ai) => [ai.id, ai]));

const fromAI = (
  ai: typeof claude,
  content: string,
  mentionsNormalized: string[] = [],
): ContextMessage => ({
  id: `${ai.id}-${content.length}`,
  senderType: "ai",
  sender: ai.displayName,
  displayName: ai.displayName,
  alias: ai.alias,
  normalizedAlias: ai.normalizedAlias,
  aiId: ai.id,
  content,
  mentionsNormalized,
});

const fromPerson = (content: string, mentionsNormalized: string[] = []) => ({
  id: `ada-${content.length}`,
  senderType: "user" as const,
  sender: "Ada",
  displayName: "Ada",
  alias: "Ada",
  normalizedAlias: "ada",
  content,
  mentionsNormalized,
});

describe("buildTranscript", () => {
  const context: ContextMessage[] = [
    fromAI(claude, "I said this earlier."),
    fromPerson("What do you all think?"),
    fromAI(gpt, "Tabs, obviously."),
    fromAI(gemini, "Spaces."),
  ];

  it("labels everyone else's messages and keeps the model's own as its turns", () => {
    const transcript = buildTranscript(claude, context, "NOTE");

    expect(transcript.map((turn) => turn.role)).toEqual([
      "user",
      "assistant",
      "user",
    ]);
    expect(transcript[1].content).toBe("I said this earlier.");
    expect(transcript[2].content).toContain(
      "[#2 Ada (human)] What do you all think?",
    );
    expect(transcript[2].content).toContain("[#3 GPT] Tabs, obviously.");
    expect(transcript[2].content).toContain("[#4 Gemini] Spaces.");
  });

  it("starts on a user turn and ends on the turn note", () => {
    const transcript = buildTranscript(claude, context, "NOTE");

    expect(transcript[0].role).toBe("user");
    expect(transcript.at(-1)?.role).toBe("user");
    expect(transcript.at(-1)?.content.endsWith("NOTE")).toBe(true);
  });

  it("adds a user turn for the note when the model spoke last", () => {
    const transcript = buildTranscript(gemini, context, "NOTE");

    expect(transcript.at(-2)?.role).toBe("assistant");
    expect(transcript.at(-1)).toEqual({ role: "user", content: "NOTE" });
  });

  it("never shows another AI's message as the model's own", () => {
    const transcript = buildTranscript(gpt, context, "NOTE");
    const ownTurns = transcript.filter((turn) => turn.role === "assistant");

    expect(ownTurns.map((turn) => turn.content)).toEqual(["Tabs, obviously."]);
  });
});

describe("stripOwnSpeakerLabel", () => {
  it.each([
    ["[Claude] Good point.", "Good point."],
    ["[Claude]: Good point.", "Good point."],
    ["Claude: Good point.", "Good point."],
    ["@claude: Good point.", "Good point."],
  ])("drops the copied label from %p", (input, expected) => {
    expect(stripOwnSpeakerLabel(input, claude)).toBe(expected);
  });

  it("leaves a reply that just starts with the name alone", () => {
    expect(stripOwnSpeakerLabel("Claude here, and I agree.", claude)).toBe(
      "Claude here, and I agree.",
    );
  });
});

describe("replying to the right speaker", () => {
  const strategyFor = (
    ai: typeof claude,
    context: ContextMessage[],
    replyTarget: ContextMessage,
  ) =>
    determineInteractionStrategy(
      ai,
      context,
      false,
      (message) => findAIFromContextMessage(aiServices, message),
      (target) => getMentionTokenForAI(target),
      replyTarget,
    );

  it("aims the reply at the scheduled message, not whoever spoke last", () => {
    const question = fromPerson("Claude, is Rust worth it?");
    const context = [question, fromAI(gpt, "Rust is great.")];

    const strategy = strategyFor(claude, context, question);
    const instruction = buildTurnInstruction(strategy, claude, question);

    expect(strategy.mentionHandle).toBe("@Ada");
    expect(instruction).toContain(
      'replying to Ada (human), who said: "Claude, is Rust worth it?"',
    );
    expect(instruction).not.toContain("GPT");
  });

  it("only ever suggests mentioning the AI being answered", () => {
    const replyTarget = fromAI(gemini, "Spaces.");
    const context = [replyTarget, fromAI(gpt, "Tabs.")];

    for (let round = 0; round < 50; round += 1) {
      const strategy = strategyFor(claude, context, replyTarget);
      if (strategy.shouldMention)
        expect(strategy.mentionHandle).toBe("@gemini");
    }
  });

  it("doesn't mention an AI back when answering its @mention", () => {
    const question = fromAI(gpt, "@claude what's your take?", ["claude"]);

    for (let round = 0; round < 50; round += 1) {
      const strategy = strategyFor(claude, [question], question);
      expect(strategy.shouldMention).toBe(false);
      const instruction = buildTurnInstruction(strategy, claude, question);
      expect(instruction).toContain("You were directly mentioned by @gpt");
    }
  });
});

describe("limitMentionsInResponse", () => {
  it("mentions each target only once", () => {
    expect(
      limitMentionsInResponse("@GPT good point. Still, @GPT, what about tabs?"),
    ).toBe("@GPT good point. Still, GPT, what about tabs?");
  });
});

import { describe, it, expect } from "vitest";
import {
  applyMentionSuggestion,
  getDraftMentionSuggestions,
  getMentionHandles,
} from "./mentionSuggestions";
import type { AiParticipant } from "@/config/aiParticipants";

const AIS: AiParticipant[] = [
  {
    id: "OPENAI_GPT6_2_ASTRA",
    name: "GPT-6.2 Astra",
    alias: "gpt-6.2-astra",
    provider: "OpenAI",
    status: "active",
    emoji: "🌄",
  },
  {
    id: "OPENAI_GPT6_ASTRA",
    name: "GPT-6 Astra",
    alias: "gpt-6-astra",
    provider: "OpenAI",
    status: "inactive",
    emoji: "🌞",
  },
];

describe("getMentionHandles", () => {
  it("lists live models by hyphenated handle, plus people", () => {
    expect(getMentionHandles(AIS, ["Skylar"])).toEqual([
      "gpt-6-2-astra",
      "Skylar",
    ]);
  });
});

describe("getDraftMentionSuggestions", () => {
  const handles = getMentionHandles(AIS, ["Skylar"]);

  it("hints at the handle a near miss meant", () => {
    expect(getDraftMentionSuggestions("@gpt-6-2-astr hi", handles)).toEqual([
      { token: "gpt-6-2-astr", suggestion: "gpt-6-2-astra" },
    ]);
  });

  it("stays quiet for spellings that route, and for people", () => {
    expect(
      getDraftMentionSuggestions("@gpt-6.2-astra and @Skylar hi", handles),
    ).toEqual([]);
  });

  it("waits until the mention being typed is finished", () => {
    expect(getDraftMentionSuggestions("hi @gpt-6-2-astr", handles)).toEqual([]);
  });
});

describe("applyMentionSuggestion", () => {
  it("replaces every whole @token, keeping punctuation", () => {
    expect(
      applyMentionSuggestion("@gpt-6-2-astr, and again @gpt-6-2-astr!", {
        token: "gpt-6-2-astr",
        suggestion: "gpt-6-2-astra",
      }),
    ).toBe("@gpt-6-2-astra, and again @gpt-6-2-astra!");
  });

  it("leaves longer tokens and emails alone", () => {
    const draft = "@gpt-6-2-astrx mail a@gpt-6-2-astr";
    expect(
      applyMentionSuggestion(draft, {
        token: "gpt-6-2-astr",
        suggestion: "gpt-6-2-astra",
      }),
    ).toBe(draft);
  });
});

import { describe, it, expect } from "vitest";
import { findMentionMatches, resolveMentionVoiceKey } from "./mentions";

describe("mentions utilities", () => {
  it("matches @mentions with spaces from known AI names", () => {
    const text = "Hello @Claude Haiku 4.5!";
    const matches = findMentionMatches(text);

    expect(matches).toHaveLength(1);
    expect(matches[0]?.text).toBe("@Claude Haiku 4.5");
  });

  it("matches @mentions from extra candidates", () => {
    const text = "Hello @Skylar welcome back.";
    const matches = findMentionMatches(text, [], ["Skylar"]);

    expect(matches).toHaveLength(1);
    expect(matches[0]?.text).toBe("@Skylar");
  });

  it("resolves a model mention to its provider, aliases included", () => {
    expect(resolveMentionVoiceKey("@claude-opus-5")).toBe("Anthropic");
    expect(resolveMentionVoiceKey("@gpt-6")).toBe("OpenAI");
    expect(resolveMentionVoiceKey("@Claude Opus 5")).toBe("Anthropic");
  });

  it("leaves people and unknown names without a voice", () => {
    expect(resolveMentionVoiceKey("@Skylar")).toBeNull();
    expect(resolveMentionVoiceKey("@")).toBeNull();
  });
});

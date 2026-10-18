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

  it("ignores an @ inside an email address or URL", () => {
    expect(
      findMentionMatches("mail skylar@Skylar.dev", [], ["Skylar"]),
    ).toHaveLength(0);
    expect(
      findMentionMatches("https://medium.com/@Skylar/post", [], ["Skylar"]),
    ).toHaveLength(0);
    expect(findMentionMatches("(@Skylar)", [], ["Skylar"])).toHaveLength(1);
  });

  it("resolves a model mention to that model's voice, aliases included", () => {
    expect(resolveMentionVoiceKey("@claude-opus-5")).toBe(
      "anthropicclaudeopus5",
    );
    expect(resolveMentionVoiceKey("@Claude Opus 5")).toBe(
      "anthropicclaudeopus5",
    );
    expect(resolveMentionVoiceKey("@gpt-6")).toBe(
      resolveMentionVoiceKey("@gpt-6-astra"),
    );
    expect(resolveMentionVoiceKey("@gpt-6")).not.toBe(
      resolveMentionVoiceKey("@claude-opus-5"),
    );
  });

  it("leaves people and unknown names without a voice", () => {
    expect(resolveMentionVoiceKey("@Skylar")).toBeNull();
    expect(resolveMentionVoiceKey("@")).toBeNull();
  });
});

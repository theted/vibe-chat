import { describe, it, expect } from "vitest";
import { extractMentionsFromText, findMentionMatches } from "./mentions";

describe("mentions utilities", () => {
  it("matches @mentions with spaces from known AI names", () => {
    const text = "Hello @Claude Haiku 4.5!";
    const matches = findMentionMatches(text);

    expect(matches).toHaveLength(1);
    expect(matches[0]?.text).toBe("@Claude Haiku 4.5");
  });

  it("extracts normalized mentions from text", () => {
    const mentions = extractMentionsFromText(
      "Ping @Claude Haiku 4.5 and @gpt-4o.",
    );

    expect(mentions).toEqual(["claude haiku 4.5", "gpt-4o"]);
  });

  it("matches @mentions from extra candidates", () => {
    const text = "Hello @Skylar welcome back.";
    const matches = findMentionMatches(text, [], ["Skylar"]);

    expect(matches).toHaveLength(1);
    expect(matches[0]?.text).toBe("@Skylar");
  });
});

import { describe, it, expect } from "vitest";
import { findMentionMatches } from "./mentions";

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
});

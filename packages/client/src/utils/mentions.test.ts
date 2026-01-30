import { describe, it, expect } from "vitest";
import { extractMentionsFromText, findMentionMatches } from "./mentions";

describe("mentions utilities", () => {
  it("matches @mentions with spaces from known AI names", () => {
    const text = "Hello @Claude 3.5 Haiku!";
    const matches = findMentionMatches(text);

    expect(matches).toHaveLength(1);
    expect(matches[0]?.text).toBe("@Claude 3.5 Haiku");
  });

  it("extracts normalized mentions from text", () => {
    const mentions = extractMentionsFromText(
      "Ping @Claude 3.5 Haiku and @gpt-4o."
    );

    expect(mentions).toEqual(["claude 3.5 haiku", "gpt-4o"]);
  });
});

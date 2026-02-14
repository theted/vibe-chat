import { describe, it, expect } from "bun:test";

import { mapMentionsToAiNames, normalizeAlias, resolveEmoji } from "../src/lookups.js";

describe("lookups", () => {
  it("normalizes aliases with lowercase, trim, and hyphens", () => {
    expect(normalizeAlias("  GPT 4o ")).toBe("gpt-4o");
  });

  it("resolves emojis for known aliases and partial matches", () => {
    expect(resolveEmoji("gpt-4o")).toBe("🌍");
    expect(resolveEmoji("grok-4-heavy")).toBe("🕹️");
    expect(resolveEmoji("gpt-4o-mini")).toBe("🌏");
  });

  it("maps mentions to canonical AI names", () => {
    const input = "Hello @Claude and @gpt-4o and @unknown";

    expect(
      mapMentionsToAiNames(input),
    ).toBe(
      "Hello @claude-sonnet-4-5 and @gpt-4o and @unknown",
    );
  });
});

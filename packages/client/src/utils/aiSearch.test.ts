import { describe, expect, it } from "vitest";
import { computeScore, fuzzyMatch, type MentionOption } from "./aiSearch";

const option = (overrides: Partial<MentionOption> = {}): MentionOption => ({
  id: "TEST_AI",
  name: "test-ai",
  displayName: "Test AI",
  provider: "TestCorp",
  emoji: "🤖",
  keywords: ["testai", "testcorp"],
  ...overrides,
});

describe("fuzzyMatch", () => {
  it("matches subsequences in order", () => {
    expect(fuzzyMatch("tai", "test-ai")).toBe(true);
    expect(fuzzyMatch("ait", "test-ai")).toBe(false);
    expect(fuzzyMatch("", "anything")).toBe(true);
  });
});

describe("computeScore", () => {
  it("ranks alias prefix above display-name prefix above substring", () => {
    expect(computeScore("test", option())).toBe(0);
    expect(computeScore("te", option({ name: "x", displayName: "test ai" }))).toBe(0.5);
    expect(computeScore("st-a", option())).toBe(1);
  });

  it("falls back to provider, keyword, then fuzzy keyword matches", () => {
    const noDirect = option({ name: "zzz", displayName: "zzz", keywords: ["alpha"] });
    expect(computeScore("corp", { ...noDirect, provider: "TestCorp" })).toBe(2);
    expect(computeScore("alph", { ...noDirect, provider: "x" })).toBe(2.5);
    expect(computeScore("aha", { ...noDirect, provider: "x" })).toBe(3);
  });

  it("returns Infinity for no match and 0 for empty term", () => {
    expect(computeScore("nomatch", option())).toBe(Number.POSITIVE_INFINITY);
    expect(computeScore("", option())).toBe(0);
  });
});

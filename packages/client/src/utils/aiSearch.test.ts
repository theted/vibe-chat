import { describe, expect, it } from "vitest";
import { normalizeAliasKey } from "@/utils/ai";
import {
  computeScore,
  fuzzyMatch,
  rankMentionOptions,
  toMentionOption,
  type MentionOption,
} from "./aiSearch";

/**
 * Options carry pre-normalized search fields, so the fixture derives them the
 * same way useAISearch does rather than letting a test hand-write a shape the
 * app never produces.
 */
const option = (overrides: Partial<MentionOption> = {}): MentionOption => {
  const base = {
    id: "TEST_AI",
    name: "test-ai",
    displayName: "Test AI",
    provider: "TestCorp",
    emoji: "🤖",
    keywords: ["testai", "testcorp"],
    ...overrides,
  };

  return {
    ...base,
    search: {
      alias: normalizeAliasKey(base.name),
      displayName: normalizeAliasKey(base.displayName),
      provider: normalizeAliasKey(base.provider),
      ...overrides.search,
    },
  };
};

/** Mirrors how the hook feeds a typed term into the scorer. */
const score = (term: string, candidate: MentionOption) =>
  computeScore(normalizeAliasKey(term), candidate);

describe("fuzzyMatch", () => {
  it("matches subsequences in order", () => {
    expect(fuzzyMatch("tai", "testai")).toBe(true);
    expect(fuzzyMatch("ait", "testai")).toBe(false);
    expect(fuzzyMatch("", "anything")).toBe(true);
  });
});

describe("computeScore", () => {
  it("ranks alias prefix above display-name prefix above substring", () => {
    expect(score("test", option())).toBe(0);
    expect(score("te", option({ name: "x", displayName: "test ai" }))).toBe(
      0.5,
    );
    expect(score("stai", option())).toBe(1);
  });

  it("falls back to provider, keyword, then fuzzy keyword matches", () => {
    const noDirect = option({
      name: "zzz",
      displayName: "zzz",
      keywords: ["alpha"],
    });
    expect(score("corp", option({ ...noDirect, provider: "TestCorp" }))).toBe(
      2,
    );
    expect(score("alph", option({ ...noDirect, provider: "x" }))).toBe(2.5);
    expect(score("aha", option({ ...noDirect, provider: "x" }))).toBe(3);
  });

  it("returns Infinity for no match and 0 for empty term", () => {
    expect(score("nomatch", option())).toBe(Number.POSITIVE_INFINITY);
    expect(score("", option())).toBe(0);
  });

  it("ignores punctuation and spacing on both sides", () => {
    const zai = option({
      name: "glm-5.3",
      displayName: "GLM-5.3",
      provider: "Z.ai",
      keywords: ["glm53", "zai"],
    });

    // "@z.ai", "@zai" and "@Z AI" are the same query
    expect(score("z.ai", zai)).toBe(2);
    expect(score("zai", zai)).toBe(2);
    expect(score("Z AI", zai)).toBe(2);
    // and so are "@glm-5.3" and "@glm 5.3"
    expect(score("glm-5.3", zai)).toBe(0);
    expect(score("glm 5.3", zai)).toBe(0);
  });
});

describe("toMentionOption", () => {
  it("inserts the alias, shows the name, and keeps description/pin", () => {
    const chat = toMentionOption({
      id: "chat_id",
      name: "Chat assistant",
      alias: "Chat",
      description: "Ask about the code",
      isPinned: true,
    });
    expect(chat.name).toBe("Chat");
    expect(chat.displayName).toBe("Chat assistant");
    expect(chat.description).toBe("Ask about the code");
    expect(chat.isPinned).toBe(true);
    expect(chat.search.alias).toBe("chat");
  });

  it("leaves description and pin off ordinary models", () => {
    const model = toMentionOption({ id: "X", name: "gpt-4" });
    expect(model).not.toHaveProperty("description");
    expect(model).not.toHaveProperty("isPinned");
    expect(model.name).toBe("gpt-4");
  });
});

describe("rankMentionOptions", () => {
  const pinned = toMentionOption({ id: "P", alias: "zeta", isPinned: true });
  const alpha = toMentionOption({ id: "A", alias: "alpha" });
  const zebra = toMentionOption({ id: "Z", alias: "zebra" });
  const ids = (term: string) =>
    rankMentionOptions([alpha, zebra, pinned], normalizeAliasKey(term)).map(
      ({ id }) => id,
    );

  it("puts a pinned option first when scores tie", () => {
    expect(ids("")).toEqual(["P", "A", "Z"]);
    expect(ids("ze")).toEqual(["P", "Z"]);
  });

  it("never lifts a pinned option over a better match", () => {
    expect(ids("zeb")).toEqual(["Z"]);
    // "a" is an alias prefix of alpha but only a substring of zeta
    expect(ids("a")[0]).toBe("A");
  });
});

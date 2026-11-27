import { describe, it, expect } from "bun:test";

import {
  findMentionSuggestions,
  getEditDistance,
  suggestMentionHandle,
  toMentionHandle,
} from "../src/mentionHandles.js";

const HANDLES = ["gpt-6-2-astra", "gpt-6-2-sol", "glm-4-5-flash", "theted"];

describe("toMentionHandle", () => {
  it("turns dots, spaces and underscores into single hyphens", () => {
    expect(toMentionHandle("gpt-6.2-astra")).toBe("gpt-6-2-astra");
    expect(toMentionHandle("GPT-6.2 Astra")).toBe("gpt-6-2-astra");
    expect(toMentionHandle("glm_4.5__flash")).toBe("glm-4-5-flash");
  });

  it("falls back when the value is blank", () => {
    expect(toMentionHandle("  ", "Fallback Name")).toBe("fallback-name");
    expect(toMentionHandle(null)).toBe("");
  });
});

describe("getEditDistance", () => {
  it("counts insertions, deletions and substitutions", () => {
    expect(getEditDistance("kitten", "sitting")).toBe(3);
    expect(getEditDistance("abc", "abc")).toBe(0);
    expect(getEditDistance("", "abc")).toBe(3);
  });

  it("stops early past the limit", () => {
    expect(getEditDistance("abcdef", "uvwxyz", 2)).toBe(3);
    expect(getEditDistance("a", "abcdef", 2)).toBe(3);
  });
});

describe("suggestMentionHandle", () => {
  it("suggests nothing for loose spellings that already route", () => {
    expect(suggestMentionHandle("gpt-6.2-astra", HANDLES)).toBeNull();
    expect(suggestMentionHandle("GPT_6_2_ASTRA", HANDLES)).toBeNull();
    expect(suggestMentionHandle("glm-4.5-flash", HANDLES)).toBeNull();
  });

  it("suggests the one handle a near miss is close to", () => {
    expect(suggestMentionHandle("gpt-6-2-astr", HANDLES)).toBe("gpt-6-2-astra");
    expect(suggestMentionHandle("glm-4.5-flsh", HANDLES)).toBe("glm-4-5-flash");
    expect(suggestMentionHandle("thetd", HANDLES)).toBe("theted");
  });

  it("allows only one edit on short tokens", () => {
    expect(suggestMentionHandle("thtd", HANDLES)).toBeNull();
  });

  it("refuses to guess when several handles are equally close", () => {
    expect(
      suggestMentionHandle("model-ab", ["model-abc", "model-abd"]),
    ).toBeNull();
  });

  it("ignores short tokens, unrelated names and known aliases", () => {
    expect(suggestMentionHandle("gpt", HANDLES)).toBeNull();
    expect(suggestMentionHandle("somebody-else", HANDLES)).toBeNull();
    // A mapped alias names its model on purpose, so it is never corrected
    expect(suggestMentionHandle("gpt-6.2", HANDLES)).toBeNull();
  });
});

describe("findMentionSuggestions", () => {
  it("reports each near miss once, without trailing punctuation", () => {
    expect(
      findMentionSuggestions(
        "@gpt-6-2-astr, what do you think? cc @gpt-6-2-astr and @theted",
        HANDLES,
      ),
    ).toEqual([{ token: "gpt-6-2-astr", suggestion: "gpt-6-2-astra" }]);
  });

  it("skips emails and URL paths", () => {
    expect(
      findMentionSuggestions("mail me at thetd@example.com", HANDLES),
    ).toEqual([]);
    expect(
      findMentionSuggestions("see medium.com/@thetd for more", HANDLES),
    ).toEqual([]);
  });
});

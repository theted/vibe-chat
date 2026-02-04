import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { mapMentionsToAiNames, normalizeAlias, resolveEmoji } from "../src/lookups.js";

describe("lookups", () => {
  it("normalizes aliases with lowercase, trim, and hyphens", () => {
    assert.equal(normalizeAlias("  GPT 4o "), "gpt-4o");
  });

  it("resolves emojis for known aliases and partial matches", () => {
    assert.equal(resolveEmoji("gpt-4o"), "🧠");
    assert.equal(resolveEmoji("grok-4-heavy"), "🏋️");
    assert.equal(resolveEmoji("gpt-4o-mini"), "🛸");
  });

  it("maps mentions to canonical AI names", () => {
    const input = "Hello @Claude and @gpt-4o and @unknown";

    assert.equal(
      mapMentionsToAiNames(input),
      "Hello @claude-sonnet-4-5 and @gpt-4o and @unknown",
    );
  });
});

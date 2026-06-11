import { describe, it, expect } from "bun:test";

import {
  AI_MENTION_MAPPINGS,
  mapMentionsToAiNames,
  normalizeAlias,
  resolveEmoji,
  resolveMentionTarget,
} from "../src/lookups.js";
import { getParticipantByAlias } from "../src/participants.js";

describe("lookups", () => {
  it("normalizes aliases with lowercase, trim, and hyphens", () => {
    expect(normalizeAlias("  GPT 4o ")).toBe("gpt-4o");
  });

  it("resolves emojis for known aliases and partial matches", () => {
    expect(resolveEmoji("gpt-4o")).toBe("🌍");
    expect(resolveEmoji("grok-4.20")).toBe("🎳");
    expect(resolveEmoji("gpt-4o-mini")).toBe("🌏");
  });

  it("maps mentions to canonical AI names", () => {
    const input = "Hello @Claude and @gpt-4o and @unknown";
    // derive from the mapping so the test survives flagship model updates
    const claudeCanonical = AI_MENTION_MAPPINGS["claude"];

    expect(mapMentionsToAiNames(input)).toBe(
      `Hello @${claudeCanonical} and @gpt-4o and @unknown`,
    );
  });
});

describe("resolveMentionTarget", () => {
  it("resolves generic aliases to canonical participant aliases", () => {
    // derive from the mapping so the test survives flagship model updates
    expect(resolveMentionTarget("claude")).toBe(AI_MENTION_MAPPINGS["claude"]);
    expect(resolveMentionTarget("chatgpt")).toBe(AI_MENTION_MAPPINGS["chatgpt"]);
    expect(resolveMentionTarget("grok")).toBe(AI_MENTION_MAPPINGS["grok"]);
  });

  it("is case-insensitive and tolerates stray punctuation", () => {
    expect(resolveMentionTarget("ChatGPT")).toBe(AI_MENTION_MAPPINGS["chatgpt"]);
    expect(resolveMentionTarget("chatgpt,")).toBe(AI_MENTION_MAPPINGS["chatgpt"]);
    expect(resolveMentionTarget("GPT-4!")).toBe(AI_MENTION_MAPPINGS["gpt-4"]);
  });

  it("passes unmapped tokens through unchanged (usernames, exact aliases)", () => {
    expect(resolveMentionTarget("some-user")).toBe("some-user");
    expect(resolveMentionTarget("claude-haiku-4-5")).toBe("claude-haiku-4-5");
  });

  it("resolves flagship aliases to real active participants", () => {
    // The bare provider aliases must always land on a participant that exists
    for (const alias of ["claude", "gpt", "gemini", "grok", "openai", "chatgpt"]) {
      const canonical = resolveMentionTarget(alias);
      const participant = getParticipantByAlias(canonical);
      expect(participant?.status).toBe("active");
    }
  });
});

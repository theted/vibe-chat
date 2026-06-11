import { describe, expect, it } from "bun:test";
import {
  AI_MENTION_MAPPINGS,
  normalizeAliasKey,
} from "@ai-chat/ai-configs";
import { parseMentions } from "@/utils/stringUtils.js";

// Mention targeting happens server-side from message content, so generic
// aliases must normalize to the same value as the participant alias they
// map to (the orchestrator matches against ai.normalizedAlias).
describe("parseMentions alias mapping", () => {
  it("resolves generic aliases to the mapped participant's normalized alias", () => {
    // derive from the mapping so the test survives flagship model updates
    const expected = normalizeAliasKey(AI_MENTION_MAPPINGS["chatgpt"]);
    expect(parseMentions("hey @chatgpt what do you think?").normalized).toEqual([
      expected,
    ]);
  });

  it("resolves bare provider aliases case-insensitively", () => {
    const expected = normalizeAliasKey(AI_MENTION_MAPPINGS["claude"]);
    expect(parseMentions("@Claude hello").normalized).toEqual([expected]);
  });

  it("keeps exact participant aliases working unchanged", () => {
    expect(parseMentions("@claude-haiku-4-5 hi").normalized).toEqual([
      normalizeAliasKey("claude-haiku-4-5"),
    ]);
  });

  it("passes unmapped tokens (usernames) through", () => {
    expect(parseMentions("thanks @some-user!").normalized).toEqual([
      normalizeAliasKey("some-user"),
    ]);
  });

  it("dedupes a generic alias and its canonical form", () => {
    const canonical = AI_MENTION_MAPPINGS["chatgpt"];
    const { normalized } = parseMentions(`@chatgpt and @${canonical}`);
    expect(normalized).toEqual([normalizeAliasKey(canonical)]);
  });

  it("keeps raw mention text alongside normalized targets", () => {
    const { mentions } = parseMentions("ping @ChatGPT now");
    expect(mentions).toEqual(["ChatGPT"]);
  });
});

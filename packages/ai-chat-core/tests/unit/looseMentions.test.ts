import { describe, expect, it } from "bun:test";
import { getActiveParticipants } from "@ai-chat/ai-configs";
import { correctNearMissMentions } from "@/utils/orchestrator/mentionUtils.js";
import {
  normalizeAlias,
  parseMentions,
  toMentionAlias,
} from "@/utils/stringUtils.js";

// Issue #298: people write handles with dots (`@gpt-6.2-astra`) while the
// registry's handle is hyphenated (`gpt-6-2-astra`). Routing compares
// AIRegistry's normalizedAlias, built as normalizeAlias(toMentionAlias(alias)).
const registryKey = (alias: string) => normalizeAlias(toMentionAlias(alias));

describe("loose @mention routing", () => {
  it("routes dotted, hyphenated, upper-case and underscored spellings", () => {
    const expected = registryKey("gpt-6.2-astra");
    for (const spelling of [
      "@gpt-6.2-astra",
      "@gpt-6-2-astra",
      "@GPT-6.2-Astra",
      "@gpt_6_2_astra",
      "@gpt-6.2-astra.",
    ]) {
      expect(parseMentions(`${spelling} hi`).normalized).toEqual([expected]);
    }
  });

  // An alias mapping that rewrites a model's own handle to another model
  // would silently misroute it, so check the whole active roster
  it("routes every active participant by its alias and its handle", () => {
    for (const { alias } of getActiveParticipants()) {
      const expected = registryKey(alias);
      expect(parseMentions(`@${alias}`).normalized).toEqual([expected]);
      expect(parseMentions(`@${toMentionAlias(alias)}`).normalized).toEqual([
        expected,
      ]);
    }
  });
});

describe("correctNearMissMentions", () => {
  const handles = ["gpt-6-2-astra", "glm-4-5-flash", "Theted"];

  it("rewrites a near miss to the one handle it meant", () => {
    expect(
      correctNearMissMentions("@gpt-6-2-astr, agreed. @glm-4-5-flsh?", handles),
    ).toBe("@gpt-6-2-astra, agreed. @glm-4-5-flash?");
  });

  it("leaves spellings that already route, people and unknowns alone", () => {
    const text = "@gpt-6.2-astra and @Theted, ask @somebody-new";
    expect(correctNearMissMentions(text, handles)).toBe(text);
  });

  it("never guesses between equally close handles", () => {
    const text = "@model-ab said so";
    expect(correctNearMissMentions(text, ["model-abc", "model-abd"])).toBe(
      text,
    );
  });

  it("skips emails", () => {
    const text = "write to info@gpt-6-2-astr.com";
    expect(correctNearMissMentions(text, handles)).toBe(text);
  });
});

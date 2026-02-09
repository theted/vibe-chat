import { describe, it, expect } from "bun:test";

import { DEFAULT_AI_PARTICIPANTS } from "../src/participants.js";
import { resolveEmoji } from "../src/lookups.js";

describe("participants", () => {
  it("uses unique ids and aliases", () => {
    const ids = new Set<string>();
    const aliases = new Set<string>();

    for (const participant of DEFAULT_AI_PARTICIPANTS) {
      expect(ids.has(participant.id)).toBe(false);
      expect(aliases.has(participant.alias)).toBe(false);
      ids.add(participant.id);
      aliases.add(participant.alias);
    }
  });

  it("keeps emoji lookups aligned with participant aliases", () => {
    for (const participant of DEFAULT_AI_PARTICIPANTS) {
      expect(resolveEmoji(participant.alias)).toBe(participant.emoji);
    }
  });
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_AI_PARTICIPANTS } from "../src/participants.js";
import { resolveEmoji } from "../src/lookups.js";

describe("participants", () => {
  it("uses unique ids and aliases", () => {
    const ids = new Set<string>();
    const aliases = new Set<string>();

    for (const participant of DEFAULT_AI_PARTICIPANTS) {
      assert.ok(!ids.has(participant.id), `Duplicate id: ${participant.id}`);
      assert.ok(
        !aliases.has(participant.alias),
        `Duplicate alias: ${participant.alias}`,
      );
      ids.add(participant.id);
      aliases.add(participant.alias);
    }
  });

  it("keeps emoji lookups aligned with participant aliases", () => {
    for (const participant of DEFAULT_AI_PARTICIPANTS) {
      assert.equal(
        resolveEmoji(participant.alias),
        participant.emoji,
        `Emoji mismatch for ${participant.alias}`,
      );
    }
  });
});

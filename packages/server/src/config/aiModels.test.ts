import { describe, expect, it } from "bun:test";
import { getActiveParticipants, getParticipantById } from "@ai-chat/ai-configs";
import { deriveEnabledModels, ENABLED_AI_MODELS } from "./aiModels.js";

// ENABLED_AI_MODELS is derived, not hardcoded — these tests assert the
// derivation contract instead of listing model IDs.
describe("ENABLED_AI_MODELS derivation", () => {
  it("contains only active participants", () => {
    for (const id of ENABLED_AI_MODELS) {
      const participant = getParticipantById(id);
      expect(participant?.status).toBe("active");
    }
  });

  it("includes every active participant unless server-disabled", () => {
    const enabled = new Set(ENABLED_AI_MODELS);
    const serverDisabled = new Set(
      (process.env.DISABLED_AI_MODELS ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    );

    for (const participant of getActiveParticipants()) {
      if (serverDisabled.has(participant.id)) continue;
      expect(enabled.has(participant.id)).toBe(true);
    }
  });
});

describe("deriveEnabledModels", () => {
  it("returns all active IDs when nothing is disabled", () => {
    expect(deriveEnabledModels(["A_1", "B_2"])).toEqual(["A_1", "B_2"]);
  });

  it("removes IDs listed in the disabled CSV", () => {
    expect(deriveEnabledModels(["A_1", "B_2", "C_3"], "B_2, C_3")).toEqual([
      "A_1",
    ]);
  });

  it("ignores empty and whitespace-only CSV entries", () => {
    expect(deriveEnabledModels(["A_1", "B_2"], " , ,B_2,")).toEqual(["A_1"]);
  });
});

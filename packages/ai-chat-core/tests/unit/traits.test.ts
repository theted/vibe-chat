import { describe, it, expect } from "bun:test";
import { TRAIT_DEFAULTS } from "@/orchestrator/constants.js";
import { resolveTraits } from "@/utils/orchestrator/traits.js";
import { selectRespondingAIs } from "@/utils/orchestrator/responseScheduling.js";

describe("resolveTraits", () => {
  it("prefers configured values over derived ones", () => {
    const traits = resolveTraits("ANTHROPIC_CLAUDE_OPUS_4_8", {
      tempo: 1.25,
      chattiness: 0.9,
    });
    expect(traits.tempo).toBe(1.25);
    expect(traits.chattiness).toBe(0.9);
  });

  it("fills unset values with stable id-derived defaults inside the bands", () => {
    const first = resolveTraits("GEMINI_GEMINI_3_PRO");
    const second = resolveTraits("GEMINI_GEMINI_3_PRO");
    expect(first).toEqual(second);

    expect(first.tempo).toBeGreaterThanOrEqual(TRAIT_DEFAULTS.MIN_TEMPO);
    expect(first.tempo).toBeLessThanOrEqual(TRAIT_DEFAULTS.MAX_TEMPO);
    expect(first.chattiness).toBeGreaterThanOrEqual(
      TRAIT_DEFAULTS.MIN_CHATTINESS,
    );
    expect(first.chattiness).toBeLessThanOrEqual(TRAIT_DEFAULTS.MAX_CHATTINESS);
  });

  it("derives different temperaments for different ids", () => {
    const ids = [
      "OPENAI_GPT_5_5",
      "GEMINI_GEMINI_3_PRO",
      "MISTRAL_MISTRAL_LARGE_3",
      "DEEPSEEK_DEEPSEEK_V4",
    ];
    const tempos = new Set(ids.map((id) => resolveTraits(id).tempo));
    expect(tempos.size).toBeGreaterThan(1);
  });

  it("mixes configured and derived values", () => {
    const traits = resolveTraits("GROK_GROK_4_3", { tempo: 0.7 });
    expect(traits.tempo).toBe(0.7);
    expect(traits.chattiness).toBeGreaterThanOrEqual(
      TRAIT_DEFAULTS.MIN_CHATTINESS,
    );
  });
});

describe("selectRespondingAIs chattiness weighting", () => {
  const makeServices = (chattinessById: Record<string, number>) =>
    new Map(
      Object.entries(chattinessById).map(([id, chattiness]) => [
        id,
        { id, isActive: true, traits: { tempo: 1, chattiness } },
      ]),
    );

  it("never picks a zero-chattiness AI while others are available", () => {
    const services = makeServices({ silent: 0, talkative: 1 });
    for (let i = 0; i < 200; i++) {
      const [selected] = selectRespondingAIs(
        services,
        ["silent", "talkative"],
        1,
        1,
      );
      expect(selected).toBe("talkative");
    }
  });

  it("still selects everyone when the whole pool is needed", () => {
    const services = makeServices({ silent: 0, quiet: 0.5, loud: 2 });
    const selected = selectRespondingAIs(
      services,
      ["silent", "quiet", "loud"],
      3,
      3,
    );
    expect(selected.sort()).toEqual(["loud", "quiet", "silent"]);
  });

  it("picks chattier AIs more often", () => {
    const services = makeServices({ shy: 0.2, chatty: 2 });
    let chattyCount = 0;
    const runs = 500;
    for (let i = 0; i < runs; i++) {
      const [selected] = selectRespondingAIs(services, ["shy", "chatty"], 1, 1);
      if (selected === "chatty") chattyCount++;
    }
    // Expected pick rate ~91%; assert well clear of the 50/50 null hypothesis
    expect(chattyCount / runs).toBeGreaterThan(0.7);
  });
});

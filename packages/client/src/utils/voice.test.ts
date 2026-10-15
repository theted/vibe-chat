import { describe, it, expect } from "vitest";
import { MIN_VOICE_GAP, VOICE_HUES } from "@/config/voices";
import { getModelVoiceKey, getVoiceHue, resolveVoiceHues } from "./voice";

const hueGap = (a: number, b: number) => {
  const distance = Math.abs(a - b) % 360;
  return Math.min(distance, 360 - distance);
};

// Plenty of keys, so the tests can pick ones whose home hues collide
const KEYS = Array.from({ length: 60 }, (_, index) => `model${index}`);

describe("voice palette", () => {
  it("stays out of the amber band reserved for the user", () => {
    for (const hue of VOICE_HUES) {
      expect(hue >= 50 && hue < 95).toBe(false);
    }
  });

  it("gives every model a stable colour of its own", () => {
    expect(getVoiceHue("model1")).toBe(getVoiceHue("model1"));
    expect(new Set(KEYS.map(getVoiceHue)).size).toBeGreaterThan(15);
  });

  it("keys a model by id, then alias, then name", () => {
    expect(getModelVoiceKey({ id: "ANTHROPIC_OPUS", alias: "opus" })).toBe(
      "anthropicopus",
    );
    expect(getModelVoiceKey({ alias: "Opus-5" })).toBe("opus5");
    expect(getModelVoiceKey({ name: "Claude Opus" })).toBe("claudeopus");
  });
});

describe("resolveVoiceHues", () => {
  it("keeps home hues that are already far enough apart", () => {
    const [first] = KEYS;
    expect(resolveVoiceHues([first]).get(first)).toBe(getVoiceHue(first));
  });

  it("moves the newcomer, not the voice already talking", () => {
    const [first, clash] = KEYS.filter(
      (key) => getVoiceHue(key) === getVoiceHue(KEYS[0]),
    );
    expect(clash).toBeDefined();

    const hues = resolveVoiceHues([first, clash]);

    expect(hues.get(first)).toBe(getVoiceHue(first));
    expect(hueGap(hues.get(first)!, hues.get(clash)!)).toBeGreaterThanOrEqual(
      MIN_VOICE_GAP,
    );
  });

  it("keeps a typical conversation's voices clearly apart", () => {
    const hues = [...resolveVoiceHues(KEYS.slice(0, 6)).values()];
    for (const [index, hue] of hues.entries()) {
      for (const other of hues.slice(index + 1)) {
        expect(hueGap(hue, other)).toBeGreaterThanOrEqual(MIN_VOICE_GAP);
      }
    }
  });

  it("still picks palette colours once the wheel is crowded", () => {
    const hues = resolveVoiceHues(KEYS.slice(0, 20));
    expect(hues.size).toBe(20);
    for (const hue of hues.values()) expect(VOICE_HUES).toContain(hue);
  });
});

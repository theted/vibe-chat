/**
 * Maps a model (or a provider, on lab-level views) to a voice hue and exposes
 * it as the --voice-h custom property consumed by the .text-voice / .bg-voice
 * utilities. Inside the chat, VoiceContext adjusts these home hues so the
 * models talking right now never share a colour.
 */

import type { CSSProperties } from "react";
import { normalizeAliasKey } from "@/utils/ai";
import { MIN_VOICE_GAP, PROVIDER_HUES, VOICE_HUES } from "@/config/voices";

// FNV-1a: tiny, stable across sessions, spreads short strings well
const hashKey = (key: string): number => {
  let hash = 0x811c9dc5;
  for (const char of key) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

/** A key's own hue, the same on every screen and every visit. */
export const getVoiceHue = (key?: string | null): number => {
  const normalized = key?.trim().toLowerCase() || "unknown";
  return (
    PROVIDER_HUES[normalized] ??
    VOICE_HUES[hashKey(normalized) % VOICE_HUES.length]
  );
};

/** The voice key for a model: its id, else alias, else name. */
export const getModelVoiceKey = (model: {
  id?: string | null;
  alias?: string | null;
  name?: string | null;
}): string => normalizeAliasKey(model.id || model.alias || model.name);

/** Distance between two hues round the wheel, 0..180. */
const hueGap = (a: number, b: number): number => {
  const distance = Math.abs(a - b) % 360;
  return Math.min(distance, 360 - distance);
};

/**
 * Hues for the voices in a conversation, given in the order they first spoke.
 * Each keeps its home hue unless an earlier voice already sits within
 * `minGap`; then it takes the nearest palette hue that is clear of everyone
 * placed so far (or, once the wheel is full, the one with the most room).
 */
export const resolveVoiceHues = (
  keys: string[],
  minGap = MIN_VOICE_GAP,
): Map<string, number> => {
  const placed = new Map<string, number>();
  const nearestPlaced = (hue: number) =>
    Math.min(180, ...[...placed.values()].map((other) => hueGap(hue, other)));

  for (const key of keys) {
    if (placed.has(key)) continue;
    const home = getVoiceHue(key);
    if (nearestPlaced(home) >= minGap) {
      placed.set(key, home);
      continue;
    }

    const clear = VOICE_HUES.filter((hue) => nearestPlaced(hue) >= minGap);
    const hue =
      clear.length > 0
        ? clear.reduce((best, hue) =>
            hueGap(hue, home) < hueGap(best, home) ? hue : best,
          )
        : VOICE_HUES.reduce((best, hue) =>
            nearestPlaced(hue) > nearestPlaced(best) ? hue : best,
          );
    placed.set(key, hue);
  }

  return placed;
};

export const voiceStyle = (hue: number): CSSProperties =>
  ({ "--voice-h": hue }) as CSSProperties;

/** Home-hue style, for views outside the chat (dashboard, dialogs). */
export const voiceStyleFor = (key?: string | null): CSSProperties =>
  voiceStyle(getVoiceHue(key));

/**
 * Maps a provider (or any stable key) to a voice hue and exposes it as the
 * --voice-h custom property consumed by the .text-voice / .bg-voice utilities.
 */

import type { CSSProperties } from "react";
import { PROVIDER_HUES, VOICE_HUES } from "@/config/voices";

// FNV-1a: tiny, stable across sessions, spreads short strings well
const hashKey = (key: string): number => {
  let hash = 0x811c9dc5;
  for (const char of key) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

export const getVoiceHue = (key?: string | null): number => {
  const normalized = key?.trim().toLowerCase() || "unknown";
  return (
    PROVIDER_HUES[normalized] ??
    VOICE_HUES[hashKey(normalized) % VOICE_HUES.length]
  );
};

export const voiceStyle = (hue: number): CSSProperties =>
  ({ "--voice-h": hue }) as CSSProperties;

export const voiceStyleFor = (key?: string | null): CSSProperties =>
  voiceStyle(getVoiceHue(key));

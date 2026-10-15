/**
 * VoiceContext - the hue each model talks in. Inside the chat it holds the
 * conversation's spread-apart hues (see useRoomVoices); anywhere else a model
 * falls back to its home hue.
 */

import { createContext, useContext, useMemo } from "react";
import { getVoiceHue, voiceStyle } from "@/utils/voice";

export type HueFor = (voiceKey: string) => number;

export const VoiceContext = createContext<HueFor>(getVoiceHue);

export const useHueFor = (): HueFor => useContext(VoiceContext);

/** --voice-h style for a voice key; undefined for people (no key). */
export const useVoiceStyle = (voiceKey?: string | null) => {
  const hueFor = useHueFor();
  return useMemo(
    () => (voiceKey ? voiceStyle(hueFor(voiceKey)) : undefined),
    [hueFor, voiceKey],
  );
};

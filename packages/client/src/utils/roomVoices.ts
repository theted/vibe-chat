/**
 * Room voices - the hues of the models heard most recently. They colour the
 * aura behind the transcript and the composer's focus edge, so the room's
 * look is literally the mix of who has been talking.
 */

import type { CSSProperties } from "react";
import {
  AMBIENT_ROOM_HUES,
  ROOM_VOICE_COUNT,
  ROOM_VOICE_LOOKBACK,
} from "@/config/voices";
import { getMessageVoiceKey } from "@/utils/messageSender";
import { getVoiceHue } from "@/utils/voice";
import type { Message } from "@/types";
import type { AiParticipant } from "@/config/aiParticipants";

/**
 * `count` hues from the distinct voices in the latest AI messages. Fewer
 * voices repeat so a one-model room glows in that model's colour alone; a
 * silent room falls back to the ambient hues. Sorted by hue rather than
 * recency so two models trading replies don't swap the aura's colours on
 * every message - it only moves when a new voice joins the mix.
 */
export const getRoomHues = (
  messages: Message[],
  aiParticipants: AiParticipant[],
  count = ROOM_VOICE_COUNT,
): number[] => {
  const heard = new Set<number>();
  const recent = messages.slice(-ROOM_VOICE_LOOKBACK).reverse();

  for (const message of recent) {
    if (heard.size >= count) break;
    const voiceKey = getMessageVoiceKey(message, aiParticipants);
    if (voiceKey) heard.add(getVoiceHue(voiceKey));
  }

  // Sort before repeating so which hue gets doubled doesn't depend on order
  const voices = (heard.size > 0 ? [...heard] : [...AMBIENT_ROOM_HUES]).sort(
    (a, b) => a - b,
  );
  return Array.from(
    { length: count },
    (_, index) => voices[index % voices.length],
  );
};

/** Exposes room hues as --room-h1..n for the aura and composer CSS. */
export const roomHueStyle = (hues: number[]): CSSProperties =>
  Object.fromEntries(
    hues.map((hue, index) => [`--room-h${index + 1}`, hue]),
  ) as CSSProperties;

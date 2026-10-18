/**
 * Room voices - who has been talking lately and the colours they talk in.
 * The same recent speakers fill the sidebar's talking list, get hues spread
 * apart so neighbours in the transcript never look alike, and tint the aura
 * behind the transcript and the composer's focus edge.
 */

import type { CSSProperties } from "react";
import {
  AMBIENT_ROOM_HUES,
  MAX_LISTED_SPEAKERS,
  ROOM_SPEAKER_LOOKBACK,
  ROOM_VOICE_COUNT,
  ROOM_VOICE_LOOKBACK,
} from "@/config/voices";
import {
  findMatchedAI,
  getAIDisplayName,
  getAIEmoji,
  getMessageVoiceKey,
  getVoiceKey,
} from "@/utils/messageSender";
import { getModelVoiceKey, getVoiceHue } from "@/utils/voice";
import type { Message } from "@/types";
import type { AiParticipant } from "@/config/aiParticipants";

export interface RoomSpeaker {
  voiceKey: string;
  /** The roster entry, or null for a voice the roster doesn't know (@Chat). */
  ai: AiParticipant | null;
  name: string;
  emoji: string;
}

/**
 * Distinct models among the last `lookback` messages, most recent first, plus
 * the order the latest `voiced` of them first spoke in. That order is what
 * the colour spreading goes by: an earlier voice keeps its colour, a
 * newcomer moves. The wheel only has room for a handful of clearly distinct
 * voices, so it serves the ones heard most recently - the ones on screen.
 */
export const getRoomSpeakers = (
  messages: Message[],
  aiParticipants: AiParticipant[],
  lookback = ROOM_SPEAKER_LOOKBACK,
  voiced = MAX_LISTED_SPEAKERS,
): { byRecency: RoomSpeaker[]; firstSpokeOrder: string[] } => {
  const speakers = new Map<string, RoomSpeaker>();
  const firstSpokeOrder: string[] = [];

  for (const message of messages.slice(-lookback)) {
    if (message.senderType !== "ai") continue;
    const ai = findMatchedAI(message, aiParticipants);
    const name = getAIDisplayName(message, ai);
    const voiceKey = getVoiceKey(message, ai, name);
    if (!speakers.has(voiceKey)) firstSpokeOrder.push(voiceKey);
    // Re-inserting moves the speaker to the end: Map order becomes recency
    speakers.delete(voiceKey);
    speakers.set(voiceKey, {
      voiceKey,
      ai,
      name,
      emoji: getAIEmoji(message, ai),
    });
  }

  const byRecency = [...speakers.values()].reverse();
  const voicedKeys = new Set(
    byRecency.slice(0, voiced).map(({ voiceKey }) => voiceKey),
  );
  return {
    byRecency,
    firstSpokeOrder: firstSpokeOrder.filter((key) => voicedKeys.has(key)),
  };
};

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
  hueFor: (voiceKey: string) => number = getVoiceHue,
  count = ROOM_VOICE_COUNT,
): number[] => {
  const heard = new Set<number>();
  const recent = messages.slice(-ROOM_VOICE_LOOKBACK).reverse();

  for (const message of recent) {
    if (heard.size >= count) break;
    const voiceKey = getMessageVoiceKey(message, aiParticipants);
    if (voiceKey) heard.add(hueFor(voiceKey));
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

/**
 * A private chat glows in its members' voices from the start, before any of
 * them has said a word. Empty when there are no known members, so the caller
 * can fall back to whoever spoke last.
 */
export const getPrivateRoomHues = (
  members: AiParticipant[],
  hueFor: (voiceKey: string) => number = getVoiceHue,
  count = ROOM_VOICE_COUNT,
): number[] => {
  const hues = members
    .slice(0, count)
    .map((ai) => hueFor(getModelVoiceKey(ai)));
  if (hues.length === 0) return [];
  return Array.from({ length: count }, (_, index) => hues[index % hues.length]);
};

/** Exposes room hues as --room-h1..n for the aura and composer CSS. */
export const roomHueStyle = (hues: number[]): CSSProperties =>
  Object.fromEntries(
    hues.map((hue, index) => [`--room-h${index + 1}`, hue]),
  ) as CSSProperties;

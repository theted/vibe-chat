/**
 * useRoomVoices - the models heard lately (for the sidebar) and the hue each
 * one talks in (for VoiceContext), from the loaded transcript.
 */

import { useMemo } from "react";
import { getRoomSpeakers } from "@/utils/roomVoices";
import { getVoiceHue, resolveVoiceHues } from "@/utils/voice";
import type { HueFor } from "@/context/VoiceContext";
import type { Message } from "@/types";
import type { AiParticipant } from "@/config/aiParticipants";

// Voice keys are lowercase alphanumerics, so this can't occur inside one
const KEY_SEPARATOR = "|";

export const useRoomVoices = (
  messages: Message[],
  aiParticipants: AiParticipant[],
) => {
  const { byRecency, firstSpokeOrder } = useMemo(
    () => getRoomSpeakers(messages, aiParticipants),
    [messages, aiParticipants],
  );

  // Only a voice joining or leaving can change anyone's colour, so the lookup
  // (and everything reading it) stays put while the same models keep talking
  const voicesKey = firstSpokeOrder.join(KEY_SEPARATOR);
  const hueFor = useMemo<HueFor>(() => {
    const hues = resolveVoiceHues(
      voicesKey ? voicesKey.split(KEY_SEPARATOR) : [],
    );
    return (voiceKey) => hues.get(voiceKey) ?? getVoiceHue(voiceKey);
  }, [voicesKey]);

  return { recentSpeakers: byRecency, hueFor };
};

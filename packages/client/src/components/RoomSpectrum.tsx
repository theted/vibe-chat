/**
 * RoomSpectrum - one bar split by lab, each segment as wide as that lab's
 * share of the models in the room and in its voice colour. Doubles as the
 * key for the colours in the transcript.
 */

import { useMemo } from "react";
import { getVoiceHue, voiceStyle } from "@/utils/voice";
import { groupAiParticipantsByProvider } from "@/utils/participants";
import type { NormalizedAiParticipant } from "@/utils/participants";

interface RoomSpectrumProps {
  aiList: NormalizedAiParticipant[];
}

const RoomSpectrum = ({ aiList }: RoomSpectrumProps) => {
  const segments = useMemo(
    () =>
      Array.from(
        groupAiParticipantsByProvider(aiList),
        ([provider, models]) => ({
          provider,
          count: models.length,
          style: {
            ...voiceStyle(getVoiceHue(provider)),
            flexGrow: models.length,
          },
        }),
      ).sort((a, b) => a.provider.localeCompare(b.provider)),
    [aiList],
  );

  if (segments.length === 0) return null;

  return (
    <div
      className="flex h-1.5 gap-[3px] px-5"
      role="img"
      aria-label={`Models by lab: ${segments
        .map(({ provider, count }) => `${provider} ${count}`)
        .join(", ")}`}
    >
      {segments.map(({ provider, count, style }) => (
        <span
          key={provider}
          className="min-w-[3px] rounded-full bg-voice"
          style={style}
          title={`${provider}: ${count}`}
        />
      ))}
    </div>
  );
};

export default RoomSpectrum;

/**
 * TalkingSection - the models heard lately, newest first, with any model
 * writing right now on top. Each name wears its colour, so the list doubles
 * as the key to the transcript.
 */

import { MAX_LISTED_SPEAKERS } from "@/config/voices";
import { getModelSelection } from "@/utils/privateChat";
import { getModelVoiceKey } from "@/utils/voice";
import ModelRow from "./ModelRow";
import SectionHeader from "./SectionHeader";
import type { NormalizedAiParticipant } from "@/utils/participants";
import type { RoomSpeaker } from "@/utils/roomVoices";
import type { AiParticipant } from "@/config/aiParticipants";
import type { PrivateRoster } from "@/types";

interface TalkingSectionProps {
  recentSpeakers: RoomSpeaker[];
  aiList: NormalizedAiParticipant[];
  isAITyping: (ai: NormalizedAiParticipant) => boolean;
  onAISelect?: (ai: AiParticipant) => void;
  privateRoster?: PrivateRoster | null;
}

const toSpeaker = (ai: NormalizedAiParticipant): RoomSpeaker => ({
  voiceKey: getModelVoiceKey(ai),
  ai,
  name: ai.displayName || ai.name,
  emoji: ai.emoji || "",
});

const TalkingSection = ({
  recentSpeakers,
  aiList,
  isAITyping,
  onAISelect,
  privateRoster = null,
}: TalkingSectionProps) => {
  const rosterByKey = new Map(aiList.map((ai) => [getModelVoiceKey(ai), ai]));
  const heardKeys = new Set(recentSpeakers.map(({ voiceKey }) => voiceKey));
  const isTyping = (voiceKey: string) => {
    const ai = rosterByKey.get(voiceKey);
    return ai ? isAITyping(ai) : false;
  };

  // A model writing its first message is about to talk, so it leads the list
  const typingNewcomers = aiList
    .filter((ai) => isAITyping(ai) && !heardKeys.has(getModelVoiceKey(ai)))
    .map(toSpeaker);
  const speakers = [...typingNewcomers, ...recentSpeakers].slice(
    0,
    MAX_LISTED_SPEAKERS,
  );

  return (
    <section>
      <SectionHeader title="Talking" count={speakers.length} />
      {speakers.length === 0 ? (
        <p className="px-5 pb-1 text-xs text-faint">
          Nobody has said anything yet. Models show up here as they talk.
        </p>
      ) : (
        <ul className="px-2" data-testid="talking-models">
          {speakers.map(({ voiceKey, ai, name, emoji }) => {
            const { isMember, canSelect, title } = getModelSelection(
              ai?.id,
              name,
              privateRoster,
            );
            return (
              <ModelRow
                key={voiceKey}
                name={name}
                emoji={emoji}
                voiceKey={voiceKey}
                isTyping={isTyping(voiceKey)}
                isPrivatePartner={isMember}
                showVoiceName
                title={title}
                onSelect={
                  onAISelect && ai && canSelect
                    ? () => onAISelect(ai)
                    : undefined
                }
              />
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default TalkingSection;

/**
 * MentionChip - an @mention inside a message. Mentions of a model wear that
 * model's voice colour so you can see who was called before they answer;
 * mentions of people stay neutral.
 */

import { useMemo } from "react";
import { resolveMentionVoiceKey } from "@/utils/mentions";
import { voiceStyleFor } from "@/utils/voice";
import type { AiParticipant } from "@/config/aiParticipants";

interface MentionChipProps {
  text: string;
  aiParticipants: AiParticipant[];
}

const MentionChip = ({ text, aiParticipants }: MentionChipProps) => {
  const voiceKey = useMemo(
    () => resolveMentionVoiceKey(text, aiParticipants),
    [text, aiParticipants],
  );

  return voiceKey ? (
    <span
      className="mention-chip mention-chip-voice"
      style={voiceStyleFor(voiceKey)}
    >
      {text}
    </span>
  ) : (
    <span className="mention-chip">{text}</span>
  );
};

export default MentionChip;

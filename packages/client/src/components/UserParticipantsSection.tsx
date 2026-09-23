/**
 * UserParticipantsSection Component - people in the room, with a typing mark
 */

import SectionHeader from "./SectionHeader";
import Spinner from "./Spinner";
import { HUMAN_VOICE_HUE } from "@/config/voices";
import type { Participant } from "@/types";

interface UserParticipantsSectionProps {
  participants: Participant[];
  isUserTyping: (username: string) => boolean;
}

const UserParticipantsSection = ({
  participants,
  isUserTyping,
}: UserParticipantsSectionProps) => {
  if (participants.length === 0) return null;

  return (
    <section>
      <SectionHeader title="People" count={participants.length} />
      <ul className="px-2">
        {participants.map((participant) => (
          <li
            key={participant.username}
            className="flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-raised font-display text-xs font-bold text-muted">
              {participant.username.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate text-fg">
              {participant.username}
            </span>
            {isUserTyping(participant.username) && (
              <Spinner
                hue={HUMAN_VOICE_HUE}
                label={`${participant.username} is typing`}
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};

export default UserParticipantsSection;

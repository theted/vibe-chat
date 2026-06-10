/**
 * UserParticipantsSection Component - Connected users with typing badges
 */

import AnimatedListItem from "./AnimatedListItem";
import SectionHeader from "./SectionHeader";
import { badgeStyles } from "@/config/participantsPanel";
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
    <div className="border-b border-slate-100 dark:border-slate-800/60">
      <SectionHeader icon="users" title="Users" count={participants.length} />
      <div className="pb-2">
        {participants.map((participant, index) => {
          const typing = isUserTyping(participant.username);
          return (
            <AnimatedListItem
              key={`user-${index}`}
              index={index}
              className="hover:bg-blue-50 dark:hover:bg-slate-800/60"
            >
              <div
                className={`w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold ${
                  typing ? "animate-pulse" : ""
                }`}
              >
                {participant.username.charAt(0).toUpperCase()}
              </div>
              <span className="font-medium text-slate-700 flex-1 dark:text-slate-200">
                {participant.username}
              </span>
              {typing ? (
                <span className={badgeStyles.typing}>
                  <div className="w-1.5 h-1.5 bg-yellow-600 rounded-full animate-bounce dark:bg-yellow-300"></div>
                  typing...
                </span>
              ) : (
                <span className={badgeStyles.online}>online</span>
              )}
            </AnimatedListItem>
          );
        })}
      </div>
    </div>
  );
};

export default UserParticipantsSection;

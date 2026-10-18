/**
 * ParticipantsList Component - Side panel: the people here, the models
 * talking lately, and every other model folded away below them
 */

import { useParticipantTyping } from "@/hooks/useParticipantTyping";
import { MODAL_CLOSE_BUTTON_CLASSES } from "@/constants/modalStyles";
import { toPanelAiParticipants } from "@/utils/participants";
import UserParticipantsSection from "./UserParticipantsSection";
import AIParticipantsSection from "./AIParticipantsSection";
import Icon from "./Icon";
import TalkingSection from "./TalkingSection";
import type { ParticipantsListProps } from "@/types";

// The sidebar only exists on wide screens; narrower ones open the drawer
const VARIANT_CLASSES = {
  sidebar:
    "hidden w-72 shrink-0 flex-col border-l border-line bg-surface lg:flex",
  drawer: "flex h-full w-full flex-col bg-surface",
} as const;

const ParticipantsList = ({
  participants = [],
  aiParticipants = [],
  recentSpeakers = [],
  typingUsers = [],
  typingAIs = [],
  isVisible = true,
  onAISelect,
  privateRoster = null,
  variant = "sidebar",
  onClose,
}: ParticipantsListProps) => {
  const { isUserTyping, isAITyping } = useParticipantTyping(
    typingUsers,
    typingAIs,
  );

  if (!isVisible) return null;

  // ChatView already resolved the placeholder-vs-server distinction
  const aiList = toPanelAiParticipants(aiParticipants);

  return (
    <aside className={VARIANT_CLASSES[variant]}>
      <div className="flex h-16 shrink-0 items-center justify-between px-5">
        <h2 className="font-display text-[15px] font-semibold text-fg">
          In the room
        </h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className={`${MODAL_CLOSE_BUTTON_CLASSES} -mr-2`}
            aria-label="Close participants"
          >
            <Icon name="x-mark" className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="thin-scrollbar flex-1 overflow-y-auto pb-4">
        <UserParticipantsSection
          participants={participants}
          isUserTyping={isUserTyping}
        />
        <TalkingSection
          recentSpeakers={recentSpeakers}
          aiList={aiList}
          isAITyping={isAITyping}
          onAISelect={onAISelect}
          privateRoster={privateRoster}
        />
        <AIParticipantsSection
          aiList={aiList}
          isAITyping={isAITyping}
          onAISelect={onAISelect}
          privateRoster={privateRoster}
          // In a private chat the list is where models get added, so a
          // freshly opened drawer shows it unfolded
          defaultExpanded={privateRoster != null}
        />
      </div>
    </aside>
  );
};

export default ParticipantsList;

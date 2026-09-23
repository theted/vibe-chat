/**
 * ParticipantsList Component - Side panel composing connected users and
 * AI participants (sections and typing matching are extracted)
 */

import { useParticipantTyping } from "@/hooks/useParticipantTyping";
import { toPanelAiParticipants } from "@/utils/participants";
import UserParticipantsSection from "./UserParticipantsSection";
import AIParticipantsSection from "./AIParticipantsSection";
import type { ParticipantsListProps } from "@/types";

const ParticipantsList = ({
  participants = [],
  aiParticipants = [],
  typingUsers = [],
  typingAIs = [],
  isVisible = true,
  onAISelect,
  activePrivateAiId = null,
}: ParticipantsListProps) => {
  const { isUserTyping, isAITyping } = useParticipantTyping(
    typingUsers,
    typingAIs,
  );

  if (!isVisible) return null;

  // ChatView already resolved the placeholder-vs-server distinction
  const aiList = toPanelAiParticipants(aiParticipants);

  return (
    <aside className="hidden w-72 shrink-0 flex-col border-l border-line bg-surface lg:flex">
      <div className="flex h-14 shrink-0 items-center border-b border-line px-5">
        <h2 className="font-display text-[15px] font-semibold text-fg">
          In the room
        </h2>
      </div>

      <div className="thin-scrollbar flex-1 overflow-y-auto pb-4">
        <UserParticipantsSection
          participants={participants}
          isUserTyping={isUserTyping}
        />
        <AIParticipantsSection
          aiList={aiList}
          isAITyping={isAITyping}
          onAISelect={onAISelect}
          activePrivateAiId={activePrivateAiId}
        />
      </div>
    </aside>
  );
};

export default ParticipantsList;

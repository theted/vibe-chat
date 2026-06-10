/**
 * ParticipantsList Component - Side panel composing connected users and
 * AI participants (sections, typing matching, and panel style are extracted)
 */

import { DEFAULT_AI_PARTICIPANTS } from "@/config/aiParticipants";
import { PANEL_STYLES } from "@/config/participantsPanel";
import { usePanelStyle } from "@/hooks/usePanelStyle";
import { useParticipantTyping } from "@/hooks/useParticipantTyping";
import { normalizeAiParticipants } from "@/utils/participants";
import Icon from "./Icon";
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
}: ParticipantsListProps) => {
  const { panelStyle, togglePanelStyle } = usePanelStyle();
  const { isUserTyping, isAITyping } = useParticipantTyping(
    typingUsers,
    typingAIs,
  );

  if (!isVisible) return null;

  const baseAIList =
    aiParticipants.length > 0 ? aiParticipants : DEFAULT_AI_PARTICIPANTS;
  const aiList = normalizeAiParticipants(baseAIList);

  return (
    <div className={`glass-surface w-80 flex flex-col rounded-tr-3xl rounded-br-3xl lg:flex hidden transition-colors duration-300 ${PANEL_STYLES[panelStyle]}`}>
      <div className="bg-gradient-to-r from-slate-600/90 to-slate-700/90 backdrop-blur-sm text-white p-4 rounded-tr-3xl border-b border-white/25 dark:from-teal-900/85 dark:to-[rgba(0,18,28,0.92)] dark:border-teal-600/20">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center dark:bg-slate-900/60">
              <Icon name="participants" className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg text-white/95">
              Participants ({participants.length + aiList.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={togglePanelStyle}
            className="glass-btn w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            title={panelStyle === "dark" ? "Switch to light glass panel" : "Switch to dark panel"}
            aria-label="Toggle panel style"
          >
            <Icon name="contrast" className="w-4 h-4 text-white/70" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <UserParticipantsSection
          participants={participants}
          isUserTyping={isUserTyping}
        />
        <AIParticipantsSection
          aiList={aiList}
          isAITyping={isAITyping}
          onAISelect={onAISelect}
        />
      </div>
    </div>
  );
};

export default ParticipantsList;

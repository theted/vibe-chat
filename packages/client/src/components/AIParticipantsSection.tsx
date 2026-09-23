/**
 * AIParticipantsSection Component - AI participants grouped by provider,
 * with typing/status badges and optional private-chat selection.
 */

import AnimatedListItem from "./AnimatedListItem";
import SectionHeader from "./SectionHeader";
import { badgeStyles } from "@/config/participantsPanel";
import {
  groupAiParticipantsByProvider,
  type NormalizedAiParticipant,
} from "@/utils/participants";
import type { AiParticipant } from "@/config/aiParticipants";

interface AIParticipantsSectionProps {
  aiList: NormalizedAiParticipant[];
  isAITyping: (ai: NormalizedAiParticipant) => boolean;
  onAISelect?: (ai: AiParticipant) => void;
  activePrivateAiId?: string | null;
}

const getModelSortKey = (ai: NormalizedAiParticipant): string =>
  (ai.displayName || ai.name || "").toLowerCase();

const AIParticipantsSection = ({
  aiList,
  isAITyping,
  onAISelect,
  activePrivateAiId = null,
}: AIParticipantsSectionProps) => {
  const aiProviders = groupAiParticipantsByProvider(aiList);
  const sortedProviders = Array.from(aiProviders.keys()).sort((a, b) =>
    a.localeCompare(b),
  );
  const canStartPrivateConversation = Boolean(onAISelect);

  let aiIndex = 0;

  return (
    <div>
      <SectionHeader icon="monitor" title="AI Assistants" count={aiList.length} />
      <div className="pb-2">
        {sortedProviders.map((provider) => {
          const providerParticipants = [...aiProviders.get(provider)!].sort(
            (a, b) => getModelSortKey(a).localeCompare(getModelSortKey(b)),
          );

          return (
            <div key={provider} className="pb-2 last:pb-0">
              <div
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 bg-slate-50/70 dark:text-slate-300 dark:bg-slate-900/60"
                data-testid={`ai-provider-${provider}`}
              >
                {provider} ({providerParticipants.length})
              </div>
              {providerParticipants.map((ai) => {
                const generating = isAITyping(ai);
                const isPrivatePartner =
                  activePrivateAiId != null && ai.id === activePrivateAiId;
                const itemIndex = aiIndex;
                aiIndex += 1;
                return (
                  <AnimatedListItem
                    key={`ai-${provider}-${ai.id || ai.alias || itemIndex}`}
                    index={itemIndex}
                    className="hover:bg-purple-50 dark:hover:bg-slate-800/60"
                  >
                    <div className={`text-2xl ${generating ? "animate-pulse" : ""}`}>
                      {ai.emoji || "🤖"}
                    </div>
                    <div className="flex-1 min-w-0">
                      {canStartPrivateConversation ? (
                        <button
                          type="button"
                          onClick={() => onAISelect?.(ai)}
                          className={`font-medium truncate text-left hover:underline ${
                            isPrivatePartner
                              ? "text-purple-700 underline dark:text-purple-200"
                              : "text-slate-700 hover:text-purple-700 dark:text-slate-200 dark:hover:text-purple-200"
                          }`}
                          data-testid={`ai-name-${ai.id || ai.alias || itemIndex}`}
                          aria-current={isPrivatePartner ? "true" : undefined}
                          title={
                            isPrivatePartner
                              ? `You are privately chatting with ${ai.displayName || ai.name}`
                              : `Start private chat with ${ai.displayName || ai.name}`
                          }
                        >
                          {ai.displayName || ai.name}
                        </button>
                      ) : (
                        <div
                          className="font-medium text-slate-700 truncate dark:text-slate-200"
                          data-testid={`ai-name-${ai.id || ai.alias || itemIndex}`}
                        >
                          {ai.displayName || ai.name}
                        </div>
                      )}
                    </div>
                    {/* Only active models are listed, so a status badge
                        would say the same thing on every row */}
                    {generating && (
                      <span className={badgeStyles.generating}>
                        <div className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce dark:bg-purple-300"></div>
                        typing...
                      </span>
                    )}
                  </AnimatedListItem>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AIParticipantsSection;

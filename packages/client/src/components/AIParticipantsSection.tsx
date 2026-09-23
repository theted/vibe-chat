/**
 * AIParticipantsSection Component - models grouped by provider, each group in
 * its voice colour, with a typing mark and optional private-chat selection.
 */

import SectionHeader from "./SectionHeader";
import Spinner from "./Spinner";
import { getVoiceHue, voiceStyle } from "@/utils/voice";
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

const ROW_CLASSES =
  "flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-left text-sm transition-colors";

const getModelName = (ai: NormalizedAiParticipant): string =>
  ai.displayName || ai.name || "";

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

  return (
    <section>
      <SectionHeader title="Models" count={aiList.length} />
      {canStartPrivateConversation && aiList.length > 0 && (
        <p className="px-5 pb-1 text-xs text-faint">
          Pick one to talk privately.
        </p>
      )}
      {sortedProviders.map((provider) => {
        const hue = getVoiceHue(provider);
        const providerParticipants = [...aiProviders.get(provider)!].sort(
          (a, b) =>
            getModelName(a)
              .toLowerCase()
              .localeCompare(getModelName(b).toLowerCase()),
        );

        return (
          <div key={provider} className="px-2 pt-3" style={voiceStyle(hue)}>
            <div className="flex items-center gap-2 px-3 pb-1 text-xs text-muted">
              <span
                className="h-1.5 w-1.5 rounded-full bg-voice"
                aria-hidden="true"
              />
              <span data-testid={`ai-provider-${provider}`}>{provider}</span>
              <span className="ml-auto tabular-nums text-faint">
                {providerParticipants.length}
              </span>
            </div>
            <ul>
              {providerParticipants.map((ai) => {
                const name = getModelName(ai);
                const testId = `ai-name-${ai.id || ai.alias || name}`;
                const isPrivatePartner =
                  activePrivateAiId != null && ai.id === activePrivateAiId;
                const content = (
                  <>
                    <span
                      className="w-5 shrink-0 text-center"
                      aria-hidden="true"
                    >
                      {ai.emoji || "🤖"}
                    </span>
                    <span
                      className={`min-w-0 flex-1 truncate ${
                        isPrivatePartner
                          ? "font-semibold text-voice"
                          : "text-fg"
                      }`}
                      data-testid={testId}
                    >
                      {name}
                    </span>
                    {isAITyping(ai) && (
                      <Spinner hue={hue} label={`${name} is typing`} />
                    )}
                  </>
                );

                return (
                  <li key={`ai-${provider}-${ai.id || ai.alias || name}`}>
                    {canStartPrivateConversation ? (
                      <button
                        type="button"
                        onClick={() => onAISelect?.(ai)}
                        className={`${ROW_CLASSES} ${
                          isPrivatePartner ? "bg-voice-soft" : "hover:bg-raised"
                        }`}
                        aria-current={isPrivatePartner ? "true" : undefined}
                        title={
                          isPrivatePartner
                            ? `You are privately chatting with ${name}`
                            : `Start private chat with ${name}`
                        }
                      >
                        {content}
                      </button>
                    ) : (
                      <div className={ROW_CLASSES}>{content}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
};

export default AIParticipantsSection;

/**
 * AIParticipantsSection Component - every model in the room, folded away by
 * default since the talking list covers who matters right now. Opening it
 * shows a search box and the models grouped by provider.
 */

import { useId, useState } from "react";
import { normalizeAliasKey } from "@/utils/ai";
import {
  groupAiParticipantsByProvider,
  type NormalizedAiParticipant,
} from "@/utils/participants";
import { getModelVoiceKey } from "@/utils/voice";
import Icon from "./Icon";
import ModelRow from "./ModelRow";
import type { AiParticipant } from "@/config/aiParticipants";

interface AIParticipantsSectionProps {
  aiList: NormalizedAiParticipant[];
  isAITyping: (ai: NormalizedAiParticipant) => boolean;
  onAISelect?: (ai: AiParticipant) => void;
  activePrivateAiId?: string | null;
  /** Start unfolded, e.g. when there's no talking list to lean on */
  defaultExpanded?: boolean;
}

const getModelName = (ai: NormalizedAiParticipant): string =>
  ai.displayName || ai.name || "";

const matchesQuery = (ai: NormalizedAiParticipant, query: string): boolean =>
  !query ||
  [getModelName(ai), ai.alias, ai.provider].some((value) =>
    normalizeAliasKey(value).includes(query),
  );

const AIParticipantsSection = ({
  aiList,
  isAITyping,
  onAISelect,
  activePrivateAiId = null,
  defaultExpanded = false,
}: AIParticipantsSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [query, setQuery] = useState("");
  const listId = useId();

  const normalizedQuery = normalizeAliasKey(query);
  const aiProviders = groupAiParticipantsByProvider(
    aiList.filter((ai) => matchesQuery(ai, normalizedQuery)),
  );
  const sortedProviders = Array.from(aiProviders.keys()).sort((a, b) =>
    a.localeCompare(b),
  );

  return (
    <section>
      <h3 className="px-2 pt-3">
        <button
          type="button"
          onClick={() => setIsExpanded((expanded) => !expanded)}
          aria-expanded={isExpanded}
          aria-controls={listId}
          className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 font-display text-sm font-semibold text-fg transition-colors hover:bg-raised"
        >
          <Icon
            name="chevron-right"
            className={`h-3.5 w-3.5 text-faint transition-transform ${
              isExpanded ? "rotate-90" : ""
            }`}
          />
          All models
          <span className="ml-auto font-sans text-xs font-normal tabular-nums text-faint">
            {aiList.length}
          </span>
        </button>
      </h3>

      {isExpanded && (
        <div id={listId}>
          <div className="px-5 pb-1 pt-2">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find a model or lab"
              aria-label="Find a model or lab"
              className="w-full rounded-md border border-line bg-canvas px-2.5 py-1.5 text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none"
            />
            {onAISelect && (
              <p className="pt-2 text-xs text-faint">
                Pick one to talk privately.
              </p>
            )}
          </div>

          {sortedProviders.length === 0 && (
            <p className="px-5 py-2 text-xs text-faint">
              No model matches “{query}”.
            </p>
          )}

          {sortedProviders.map((provider) => {
            const models = [...aiProviders.get(provider)!].sort((a, b) =>
              getModelName(a)
                .toLowerCase()
                .localeCompare(getModelName(b).toLowerCase()),
            );

            return (
              <div key={provider} className="px-2 pt-3">
                <div className="flex items-center gap-2 px-3 pb-1 text-xs">
                  <span
                    className="font-semibold text-muted"
                    data-testid={`ai-provider-${provider}`}
                  >
                    {provider}
                  </span>
                  <span className="ml-auto tabular-nums text-faint">
                    {models.length}
                  </span>
                </div>
                <ul>
                  {models.map((ai) => {
                    const name = getModelName(ai);
                    return (
                      <ModelRow
                        key={`ai-${provider}-${ai.id || ai.alias || name}`}
                        name={name}
                        emoji={ai.emoji}
                        voiceKey={getModelVoiceKey(ai)}
                        isTyping={isAITyping(ai)}
                        isPrivatePartner={
                          activePrivateAiId != null &&
                          ai.id === activePrivateAiId
                        }
                        onSelect={onAISelect ? () => onAISelect(ai) : undefined}
                        testId={`ai-name-${ai.id || ai.alias || name}`}
                      />
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default AIParticipantsSection;

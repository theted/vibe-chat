/**
 * MentionSuggestionHint - "Did you mean @gpt-6-2-astra?" above the composer
 * for each near-miss @mention in the draft. Picking one fixes the draft; the
 * hint never blocks sending, since the name may be someone not listed.
 */

import type { MentionSuggestion } from "@ai-chat/ai-configs";

interface MentionSuggestionHintProps {
  suggestions: MentionSuggestion[];
  onApply: (suggestion: MentionSuggestion) => void;
}

const MentionSuggestionHint = ({
  suggestions,
  onApply,
}: MentionSuggestionHintProps) => (
  <ul className="mb-2 flex flex-col gap-1 text-sm" aria-label="Mention hints">
    {suggestions.map((suggestion) => (
      <li key={suggestion.token} className="text-muted">
        <span className="font-mono">@{suggestion.token}</span> matches nobody.
        Did you mean{" "}
        <button
          type="button"
          onClick={() => onApply(suggestion)}
          className="font-mono font-semibold text-accent underline-offset-2 hover:underline"
        >
          @{suggestion.suggestion}
        </button>
        ?
      </li>
    ))}
  </ul>
);

export default MentionSuggestionHint;

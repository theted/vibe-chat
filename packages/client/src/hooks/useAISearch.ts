/**
 * useAISearch — builds the mention candidate list from the AI participants
 * that can actually answer, and ranks it against the current search term.
 */

import { useMemo } from "react";
import { normalizeAliasKey } from "@/utils/ai";
import { computeScore, type MentionOption } from "@/utils/aiSearch";
import { getActiveParticipants } from "@/config/aiParticipants";
import { EXTRA_AI_PARTICIPANTS } from "@/config/extraAiParticipants";

export const useAISearch = (searchTerm = "") => {
  const mentionOptions = useMemo<MentionOption[]>(() => {
    // Parked models never load on the server, so offering one to mention is a
    // message nobody answers. EXTRA_AI_PARTICIPANTS are generic aliases that
    // resolve to an active model, so they carry no status of their own.
    const combined = [...getActiveParticipants(), ...EXTRA_AI_PARTICIPANTS];

    return combined.map((ai) => {
      const alias = ai.alias || ai.name;
      const displayName = ai.name || alias || ai.id;

      return {
        id: ai.id,
        name: alias,
        displayName,
        provider: ai.provider || "AI",
        emoji: ai.emoji || "🤖",
        search: {
          alias: normalizeAliasKey(alias),
          displayName: normalizeAliasKey(displayName),
          provider: normalizeAliasKey(ai.provider),
        },
        keywords: Array.from(
          new Set(
            [alias, ai.name, ai.provider, ai.id, displayName]
              .map((value) => normalizeAliasKey(value))
              .filter(Boolean),
          ),
        ),
      };
    });
  }, []);

  /** What the user typed — for display, and for "is this still a mention?". */
  const normalizedTerm = searchTerm?.trim().toLowerCase() || "";
  /** The same term reduced to the form every candidate is indexed by. */
  const searchKey = normalizeAliasKey(normalizedTerm);

  const filteredAIs = useMemo(
    () =>
      mentionOptions
        .map((option) => ({ ...option, score: computeScore(searchKey, option) }))
        .filter((option) => option.score < Number.POSITIVE_INFINITY)
        .sort((a, b) =>
          a.score !== b.score
            ? a.score - b.score
            : a.displayName.localeCompare(b.displayName),
        ),
    [mentionOptions, searchKey],
  );

  return { filteredAIs, normalizedTerm };
};

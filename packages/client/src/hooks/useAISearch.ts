/**
 * useAISearch — builds the mention candidate list from configured AI
 * participants and ranks it against the current search term, with a brief
 * loading shimmer on term changes.
 */

import { useEffect, useMemo, useState } from "react";
import { normalizeAliasKey } from "@/utils/ai";
import { computeScore, type MentionOption } from "@/utils/aiSearch";
import { DEFAULT_AI_PARTICIPANTS } from "@/config/aiParticipants";
import { EXTRA_AI_PARTICIPANTS } from "@/config/extraAiParticipants";

const SEARCH_LOADING_MS = 160;

export const useAISearch = (searchTerm = "") => {
  const [isLoading, setIsLoading] = useState(false);

  const mentionOptions = useMemo<MentionOption[]>(() => {
    const combined = [...DEFAULT_AI_PARTICIPANTS, ...EXTRA_AI_PARTICIPANTS];
    return combined.map((ai) => {
      const alias = ai.alias || ai.name;
      const displayName = ai.name || alias || ai.id;
      const normalizedAlias = normalizeAliasKey(alias);
      const normalizedName = normalizeAliasKey(ai.name || displayName);
      const normalizedProvider = normalizeAliasKey(ai.provider || "");
      const keywords = [alias, ai.name, ai.provider, ai.id, displayName]
        .filter(Boolean)
        .map((v) => normalizeAliasKey(v))
        .filter(Boolean);

      return {
        id: ai.id,
        name: alias,
        displayName,
        provider: ai.provider || "AI",
        emoji: ai.emoji || "🤖",
        keywords: Array.from(
          new Set([normalizedAlias, normalizedName, normalizedProvider, ...keywords])
        ).filter(Boolean),
      };
    });
  }, []);

  const normalizedTerm = searchTerm?.trim().toLowerCase() || "";

  const filteredAIs = useMemo(() => {
    return mentionOptions
      .map((opt) => ({ ...opt, score: computeScore(normalizedTerm, opt) }))
      .filter((opt) => (normalizedTerm ? opt.score < Number.POSITIVE_INFINITY : true))
      .sort((a, b) =>
        a.score !== b.score
          ? a.score - b.score
          : a.displayName.localeCompare(b.displayName),
      );
  }, [mentionOptions, normalizedTerm]);

  // Loading shimmer on search change
  useEffect(() => {
    if (!normalizedTerm) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const t = setTimeout(() => setIsLoading(false), SEARCH_LOADING_MS);
    return () => clearTimeout(t);
  }, [normalizedTerm]);

  return { filteredAIs, normalizedTerm, isLoading };
};

/**
 * Search & ranking for the AI mention dialog.
 * Lower score = better match; Infinity = no match.
 *
 * Both sides of every comparison are normalized with normalizeAliasKey, so
 * punctuation never decides a match: "@z.ai", "@zai" and "@Z AI" all behave
 * identically, and so do "@claude-opus" and "@claude opus". Mixing raw and
 * normalized text (as an earlier version did) made the alias/display/provider
 * branches and the keyword branches disagree about the same query.
 */

import { normalizeAliasKey } from "@/utils/ai";

/** Raw shape a mention target is built from (a participant or extra entry). */
export interface MentionSource {
  id: string;
  name?: string;
  alias?: string;
  provider?: string;
  emoji?: string;
  /** Shown in place of "name, provider" for targets that aren't models. */
  description?: string;
  /** Pinned targets win ties, so with an empty term they head the list. */
  isPinned?: boolean;
}

export interface MentionOption {
  id: string;
  name: string;
  displayName: string;
  provider: string;
  emoji: string;
  /** Pre-normalized forms of the fields above, built once per option. */
  search: {
    alias: string;
    displayName: string;
    provider: string;
  };
  keywords: string[];
  description?: string;
  isPinned?: boolean;
  score?: number;
}

/** Builds a dialog option, pre-normalizing everything search compares. */
export const toMentionOption = (source: MentionSource): MentionOption => {
  const { id, name, provider, description, isPinned } = source;
  const alias = source.alias || name || id;
  const displayName = name || alias;

  return {
    id,
    name: alias,
    displayName,
    provider: provider || "AI",
    emoji: source.emoji || "🤖",
    search: {
      alias: normalizeAliasKey(alias),
      displayName: normalizeAliasKey(displayName),
      provider: normalizeAliasKey(provider),
    },
    keywords: Array.from(
      new Set(
        [alias, name, provider, id, displayName]
          .map((value) => normalizeAliasKey(value))
          .filter(Boolean),
      ),
    ),
    ...(description ? { description } : {}),
    ...(isPinned ? { isPinned } : {}),
  };
};

/** Subsequence match: every char of term appears in order in candidate. */
export const fuzzyMatch = (term: string, candidate: string): boolean => {
  if (!term) return true;
  let ti = 0;
  for (let i = 0; i < candidate.length && ti < term.length; i++) {
    if (candidate[i] === term[ti]) ti++;
  }
  return ti === term.length;
};

/** `term` must already be normalized with normalizeAliasKey. */
export const computeScore = (term: string, option: MentionOption): number => {
  if (!term) return 0;
  const { alias, displayName, provider } = option.search;

  if (alias.startsWith(term)) return 0;
  if (displayName.startsWith(term)) return 0.5;
  if (alias.includes(term)) return 1;
  if (displayName.includes(term)) return 1.5;
  if (provider.includes(term)) return 2;
  if (option.keywords.some((k) => k.includes(term))) return 2.5;
  if (option.keywords.some((k) => fuzzyMatch(term, k))) return 3;
  return Number.POSITIVE_INFINITY;
};

/**
 * Matching options, best first. A pinned option only wins ties: it heads the
 * unfiltered list and any prefix it matches, but never outranks a better match
 * (a fuzzy hit on @Chat stays below an exact model prefix).
 * `term` must already be normalized with normalizeAliasKey.
 */
export const rankMentionOptions = (
  options: MentionOption[],
  term: string,
): MentionOption[] =>
  options
    .map((option) => ({ ...option, score: computeScore(term, option) }))
    .filter((option) => option.score < Number.POSITIVE_INFINITY)
    .sort(
      (a, b) =>
        a.score - b.score ||
        Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned)) ||
        a.displayName.localeCompare(b.displayName),
    );

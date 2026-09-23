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
  score?: number;
}

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

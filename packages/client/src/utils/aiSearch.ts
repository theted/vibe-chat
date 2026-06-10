/**
 * Search & ranking for the AI mention dialog.
 * Lower score = better match; Infinity = no match.
 */

export interface MentionOption {
  id: string;
  name: string;
  displayName: string;
  provider: string;
  emoji: string;
  keywords: string[];
  score?: number;
}

/** Subsequence match: every char of term appears in order in candidate. */
export const fuzzyMatch = (term: string, candidate: string): boolean => {
  if (!term) return true;
  let ti = 0;
  const t = term.toLowerCase();
  const c = candidate.toLowerCase();
  for (let i = 0; i < c.length && ti < t.length; i++) {
    if (c[i] === t[ti]) ti++;
  }
  return ti === t.length;
};

export const computeScore = (term: string, option: MentionOption): number => {
  if (!term) return 0;
  const alias = option.name.toLowerCase();
  const display = option.displayName.toLowerCase();
  const provider = option.provider.toLowerCase();

  if (alias.startsWith(term)) return 0;
  if (display.startsWith(term)) return 0.5;
  if (alias.includes(term)) return 1;
  if (display.includes(term)) return 1.5;
  if (provider.includes(term)) return 2;
  if (option.keywords.some((k) => k.includes(term))) return 2.5;
  if (option.keywords.some((k) => fuzzyMatch(term, k))) return 3;
  return Number.POSITIVE_INFINITY;
};

/**
 * Per-AI conversational traits (tempo + chattiness). Values from participant
 * config win; anything unset gets a stable default hashed from the AI id so
 * every AI has a slightly different temperament without hand-tuning.
 */

import { TRAIT_DEFAULTS } from "@/orchestrator/constants.js";

export type ResolvedTraits = {
  /** Response-delay multiplier: <1 replies faster, >1 replies slower. */
  tempo: number;
  /** Responder-selection weight: higher speaks up more often. */
  chattiness: number;
};

export type ConfiguredTraits = Partial<ResolvedTraits>;

/**
 * FNV-1a hash mapped to [0, 1). Deterministic across restarts so an AI's
 * derived temperament is part of its identity, not a per-session roll.
 */
const hashToUnit = (seed: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) / 0x100000000;
};

const lerp = (min: number, max: number, unit: number) =>
  min + (max - min) * unit;

export const resolveTraits = (
  aiId: string,
  configured?: ConfiguredTraits,
): ResolvedTraits => ({
  tempo:
    configured?.tempo ??
    lerp(
      TRAIT_DEFAULTS.MIN_TEMPO,
      TRAIT_DEFAULTS.MAX_TEMPO,
      hashToUnit(`${aiId}:tempo`),
    ),
  chattiness:
    configured?.chattiness ??
    lerp(
      TRAIT_DEFAULTS.MIN_CHATTINESS,
      TRAIT_DEFAULTS.MAX_CHATTINESS,
      hashToUnit(`${aiId}:chattiness`),
    ),
});

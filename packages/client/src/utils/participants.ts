/**
 * Helpers for normalizing and grouping AI participants for display.
 */

import { normalizeAlias } from "@/utils/ai";
import type { AiParticipant } from "@/config/aiParticipants";

export interface NormalizedAiParticipant extends AiParticipant {
  displayName: string;
  normalizedAlias: string;
}

export const normalizeAiParticipants = (
  aiParticipants: AiParticipant[],
): NormalizedAiParticipant[] =>
  aiParticipants.map((ai) => {
    const alias = ai.alias || ai.name;
    return {
      ...ai,
      displayName: ai.name,
      alias,
      normalizedAlias: normalizeAlias(alias),
      status: ai.status || "active",
    };
  });

export const groupAiParticipantsByProvider = (
  aiList: NormalizedAiParticipant[],
): Map<string, NormalizedAiParticipant[]> =>
  aiList.reduce((groups, ai) => {
    const provider = ai.provider || "Other";
    if (!groups.has(provider)) {
      groups.set(provider, []);
    }
    groups.get(provider)!.push(ai);
    return groups;
  }, new Map<string, NormalizedAiParticipant[]>());

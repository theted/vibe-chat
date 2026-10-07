/**
 * Helpers for normalizing and grouping AI participants for display.
 */

import { normalizeAliasKey } from "@/utils/ai";
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
      normalizedAlias: normalizeAliasKey(alias),
      status: ai.status || "active",
    };
  });

/**
 * The side panel only lists models that can actually answer. The server's
 * roster is already active-only, but the bundled catalogue used as a
 * placeholder before it arrives is not, so filter here and the panel never
 * shows a parked model — not even on first paint.
 */
export const toPanelAiParticipants = (
  aiParticipants: AiParticipant[],
): NormalizedAiParticipant[] =>
  normalizeAiParticipants(aiParticipants).filter(
    (ai) => ai.status === "active",
  );

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

/** Finds the participant behind a typing mark by id, then by alias. */
export const findTypingAiParticipant = (
  typer: { id?: string; alias?: string; normalizedAlias?: string },
  aiParticipants: AiParticipant[],
): AiParticipant | null => {
  const alias = typer.normalizedAlias || normalizeAliasKey(typer.alias);
  return (
    aiParticipants.find(
      (ai) =>
        (typer.id && ai.id === typer.id) ||
        (alias && normalizeAliasKey(ai.alias || ai.name) === alias),
    ) ?? null
  );
};

/**
 * AI service utility functions - shared across orchestrator and socket controller
 */

import { resolveText } from "./stringUtils.js";
import type { ActiveAIParticipant } from "@/types.js";

export type OrchestratorAIServiceInfo = {
  id?: string;
  name?: string;
  displayName?: string;
  displayAlias?: string;
  alias?: string;
  normalizedAlias?: string;
  emoji?: string;
  config?: {
    providerKey?: string;
  };
  isActive?: boolean;
};

/**
 * Safely cast an unknown value to OrchestratorAIServiceInfo
 */
export const toOrchestratorAIServiceInfo = (
  value: unknown
): OrchestratorAIServiceInfo | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as OrchestratorAIServiceInfo;
};

/**
 * Transform AI services map into ActiveAIParticipant array for clients
 */
export const transformAIServicesToParticipants = (
  aiServices: Map<string, unknown>
): ActiveAIParticipant[] => {
  return Array.from(aiServices.values())
    .map(toOrchestratorAIServiceInfo)
    .filter((ai): ai is OrchestratorAIServiceInfo => ai !== null)
    .map((ai) => {
      const name = resolveText(ai.name, "AI");
      const displayName = resolveText(ai.displayName, name);
      const alias = resolveText(
        ai.displayAlias,
        resolveText(ai.alias, displayName)
      );
      const normalizedAlias = resolveText(ai.normalizedAlias, alias);

      return {
        id: resolveText(ai.id, alias),
        name: displayName,
        displayName,
        alias,
        mentionAlias: resolveText(ai.alias, alias),
        normalizedAlias,
        emoji: ai.emoji,
        provider:
          ai.config?.providerKey?.toUpperCase?.() || resolveText(ai.name, "AI"),
        status: ai.isActive ? "active" : "inactive",
      } as ActiveAIParticipant;
    });
};

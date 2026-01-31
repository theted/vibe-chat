import type { IAIService } from "@/types/index.js";
import { normalizeAlias, toMentionAlias } from "@/utils/stringUtils.js";

export type OrchestratorAIService = {
  id?: string;
  name?: string;
  displayName?: string;
  displayAlias?: string;
  alias?: string;
  normalizedAlias?: string;
  emoji?: string;
  isActive?: boolean;
  isGenerating?: boolean;
  justResponded?: boolean;
  lastMessageTime?: number;
  config?: {
    providerKey?: string;
    modelKey?: string;
    displayName?: string;
    alias?: string;
  };
  service?: IAIService;
};

export const findAIByNormalizedAlias = (
  aiServices: Map<string, OrchestratorAIService>,
  normalizedAlias?: string | null,
) => {
  if (!normalizedAlias) return null;
  for (const ai of aiServices.values()) {
    if (!ai) continue;
    if (ai.normalizedAlias === normalizedAlias) return ai;
    if (normalizeAlias(ai.displayName) === normalizedAlias) return ai;
    if (normalizeAlias(ai.name) === normalizedAlias) return ai;
    if (normalizeAlias(ai.config?.modelKey) === normalizedAlias) return ai;
  }
  return null;
};

export const findAIFromContextMessage = (
  aiServices: Map<string, OrchestratorAIService>,
  message,
) => {
  if (!message) return null;

  if (message.aiId && aiServices.has(message.aiId)) {
    return aiServices.get(message.aiId);
  }

  const candidates = [
    message.alias,
    message.normalizedAlias,
    message.displayName,
    message.sender,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const ai = findAIByNormalizedAlias(aiServices, normalizeAlias(candidate));
    if (ai) return ai;
  }

  return null;
};

export const getMentionTokenForAI = (ai: OrchestratorAIService | null) => {
  if (!ai) return null;
  if (ai.alias) return ai.alias;
  if (ai.displayName) return toMentionAlias(ai.displayName);
  return toMentionAlias(ai.name || ai.id || "");
};

export const getAIDisplayName = (ai: OrchestratorAIService | null) => {
  if (!ai) return "";
  const candidates = [
    ai.displayName,
    ai.config?.displayName,
    ai.displayAlias,
    ai.config?.alias,
    ai.config?.modelKey,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (trimmed) return trimmed;
    }
  }

  if (typeof ai.service?.getModel === "function") {
    const model = ai.service.getModel();
    if (model) return model;
  }

  return ai.name || ai.id || "";
};

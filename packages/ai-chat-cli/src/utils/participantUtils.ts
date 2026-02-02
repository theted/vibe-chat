/**
 * Participant Utilities
 * Functions for resolving and managing AI participants
 */

import fs from "fs";
import path from "path";
import { AI_PROVIDERS, DEFAULT_MODELS } from "@ai-chat/core";
import type { AIModel, AIProvider } from "@ai-chat/core";
import type {
  ParticipantConfig,
  ResolvedParticipantConfig,
  ParticipantMetadata,
} from "../types/cli.js";
import { normalizeProviderInput } from "./argParser.js";

type ProviderKey = keyof typeof AI_PROVIDERS;

/**
 * Resolve provider key from provider name
 */
export const resolveProviderKey = (providerName: string): ProviderKey => {
  const normalized = normalizeProviderInput(providerName);
  const providerKey = (Object.keys(AI_PROVIDERS) as ProviderKey[]).find(
    (key) => key.toLowerCase() === normalized,
  );

  if (!providerKey) {
    throw new Error(`Unsupported provider: ${providerName}`);
  }

  return providerKey;
};

/**
 * Find provider key from provider config
 */
export const findProviderKey = (
  providerConfig: AIProvider,
): ProviderKey | null => {
  const entry = (
    Object.entries(AI_PROVIDERS) as [ProviderKey, AIProvider][]
  ).find(([, provider]) => provider === providerConfig);
  return entry ? entry[0] : null;
};

/**
 * Find model key from provider config
 */
export const findModelKey = (
  providerConfig: AIProvider,
  modelConfig: AIModel,
): string | null => {
  const entry = Object.entries(providerConfig.models).find(
    ([, model]) => model === modelConfig,
  );
  return entry ? entry[0] : null;
};

/**
 * Build participant metadata from resolved config
 */
export const buildParticipantMetadata = (
  participantConfig: ResolvedParticipantConfig,
): ParticipantMetadata => {
  const providerKey = findProviderKey(participantConfig.provider);
  const modelKey = findModelKey(
    participantConfig.provider,
    participantConfig.model,
  );

  return {
    providerKey,
    providerAlias: providerKey ? providerKey.toLowerCase() : null,
    providerName: participantConfig.provider.name,
    modelKey,
    modelId: participantConfig.model.id,
  };
};

/**
 * Convert participant metadata back to participant config
 */
export const participantsFromMetadata = (
  metadataParticipants: ParticipantMetadata[] = [],
): ParticipantConfig[] =>
  metadataParticipants
    .filter((meta) => meta.providerKey && meta.modelKey)
    .map((meta) => ({
      provider: (meta.providerAlias || meta.providerKey || "").toLowerCase(),
      model: meta.modelKey,
    }));

/**
 * Resolve conversation file path
 */
export const resolveConversationPath = (filePath?: string): string | null => {
  if (!filePath) return null;
  const normalized = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);

  if (fs.existsSync(normalized)) {
    return normalized;
  }

  const conversationsDir = path.join(process.cwd(), "conversations");
  const fallback = path.join(conversationsDir, filePath);
  return fs.existsSync(fallback) ? fallback : normalized;
};

/**
 * Get provider and model configuration based on provider name and optional model name
 */
export const getProviderConfig = (
  participantConfig: ParticipantConfig,
): ResolvedParticipantConfig => {
  const providerName = participantConfig.provider;
  const modelName = participantConfig.model;

  const providerKey = resolveProviderKey(providerName);
  const provider = AI_PROVIDERS[providerKey];

  // If a specific model was requested, use it
  if (modelName) {
    if (!provider.models[modelName]) {
      throw new Error(
        `Model ${modelName} not found for provider ${provider.name}`,
      );
    }
    return {
      provider,
      model: provider.models[modelName],
    };
  }

  // Otherwise use the default model for the provider
  return {
    provider,
    model: DEFAULT_MODELS[provider.name],
  };
};

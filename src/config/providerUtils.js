import { AI_PROVIDERS, DEFAULT_MODELS } from "@ai-chat/core";
import { CLI_ALIASES } from "./constants.js";

const buildProviderAliasMap = () => {
  const aliasMap = {};

  Object.keys(AI_PROVIDERS).forEach((providerKey) => {
    aliasMap[providerKey.toLowerCase()] = providerKey;
  });

  Object.entries(CLI_ALIASES).forEach(([alias, canonical]) => {
    const providerKey = Object.keys(AI_PROVIDERS).find(
      (key) => key.toLowerCase() === canonical.toLowerCase()
    );
    if (providerKey) {
      aliasMap[alias.toLowerCase()] = providerKey;
    }
  });

  return aliasMap;
};

const PROVIDER_ALIASES = buildProviderAliasMap();

export const normalizeProviderKey = (rawProvider) => {
  if (!rawProvider) return null;
  return PROVIDER_ALIASES[rawProvider.toLowerCase()] || null;
};

export const getProviderConfig = ({ provider, model }) => {
  const providerKey = normalizeProviderKey(provider);
  if (!providerKey) {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  const providerConfig = AI_PROVIDERS[providerKey];

  if (model) {
    const normalizedModel = model.toUpperCase();
    const modelConfig = providerConfig.models[normalizedModel];
    if (!modelConfig) {
      throw new Error(
        `Model ${normalizedModel} not found for provider ${providerConfig.name}`
      );
    }
    return { provider: providerConfig, model: modelConfig };
  }

  const defaultModel = DEFAULT_MODELS[providerConfig.name];
  if (!defaultModel) {
    throw new Error(
      `No default model configured for provider ${providerConfig.name}`
    );
  }

  return {
    provider: providerConfig,
    model: defaultModel,
  };
};

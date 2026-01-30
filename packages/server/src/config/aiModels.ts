/**
 * AI Model Configuration
 *
 * Maps providers to their environment variable keys and defines
 * which models to initialize when API keys are available.
 *
 * Uses AI_PROVIDERS from @ai-chat/core as source of truth for available models.
 */

import { AI_PROVIDERS, AI_DISPLAY_INFO } from "@ai-chat/core";

export type AIConfig = {
  providerKey: string;
  modelKey: string;
  displayName?: string;
  alias?: string;
  emoji?: string;
};

/**
 * Maps provider keys to their environment variable names
 */
export const PROVIDER_ENV_VARS: Record<string, string> = {
  OPENAI: "OPENAI_API_KEY",
  ANTHROPIC: "ANTHROPIC_API_KEY",
  GROK: "GROK_API_KEY",
  GEMINI: "GOOGLE_AI_API_KEY",
  MISTRAL: "MISTRAL_API_KEY",
  COHERE: "COHERE_API_KEY",
  DEEPSEEK: "DEEPSEEK_API_KEY",
  KIMI: "KIMI_API_KEY",
  ZAI: "Z_API_KEY",
  QWEN: "QWEN_API_KEY",
  LLAMA: "LLAMA_API_KEY",
  PERPLEXITY: "PERPLEXITY_API_KEY",
};

/**
 * Gets all model keys for a given provider from AI_PROVIDERS
 */
export const getProviderModels = (providerKey: string): string[] => {
  const provider = AI_PROVIDERS[providerKey as keyof typeof AI_PROVIDERS];
  if (!provider?.models) return [];
  return Object.keys(provider.models);
};

/**
 * Creates AI config with display info for a provider/model combination
 */
export const createAIConfig = (
  providerKey: string,
  modelKey: string
): AIConfig => {
  const config: AIConfig = { providerKey, modelKey };
  const displayKey = `${providerKey}_${modelKey}`;
  if (AI_DISPLAY_INFO[displayKey]) {
    Object.assign(config, AI_DISPLAY_INFO[displayKey]);
  }
  return config;
};

/**
 * Gets all AI configs for providers with available API keys
 * Dynamically pulls all models from AI_PROVIDERS
 */
export const getAvailableAIConfigs = (): AIConfig[] => {
  const configs: AIConfig[] = [];

  for (const [providerKey, envVar] of Object.entries(PROVIDER_ENV_VARS)) {
    if (!process.env[envVar]) continue;

    const models = getProviderModels(providerKey);
    models.forEach((modelKey) => {
      // Only add models that have display info configured
      const displayKey = `${providerKey}_${modelKey}`;
      if (AI_DISPLAY_INFO[displayKey]) {
        configs.push(createAIConfig(providerKey, modelKey));
      }
    });
  }

  return configs;
};

/**
 * Parses an allowlist env var and filters to valid model keys
 */
export const parseModelAllowlist = (
  envVarName: string,
  validKeys: string[]
): string[] => {
  const rawList = process.env[envVarName];
  if (!rawList) return [];

  const normalized = rawList
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.replace(/-/g, "_").toUpperCase());

  return normalized.filter((item) => validKeys.includes(item));
};

/**
 * Gets AI configs for a specific provider, optionally filtered by allowlist
 */
export const getProviderAIConfigs = (
  providerKey: string,
  allowlistEnvVar?: string
): AIConfig[] => {
  const allModels = getProviderModels(providerKey);
  if (allModels.length === 0) return [];

  let selectedModels = allModels;

  // Apply allowlist if provided and has valid entries
  if (allowlistEnvVar) {
    const allowlist = parseModelAllowlist(allowlistEnvVar, allModels);
    if (allowlist.length > 0) {
      selectedModels = allowlist;
    } else if (process.env[allowlistEnvVar]) {
      console.warn(
        `⚠️  ${allowlistEnvVar} did not match any supported ${providerKey} models; using all available.`
      );
    }
  }

  return selectedModels
    .filter((modelKey) => {
      const displayKey = `${providerKey}_${modelKey}`;
      return AI_DISPLAY_INFO[displayKey] !== undefined;
    })
    .map((modelKey) => createAIConfig(providerKey, modelKey));
};

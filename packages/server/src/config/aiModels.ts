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
 * Enabled AI models for server startup.
 *
 * Comment out any entries to disable those models without changing logic.
 */
export const ENABLED_AI_MODELS: string[] = [
  // OpenAI Models
  "OPENAI_GPT4O",
  "OPENAI_GPT4_1",
  "OPENAI_GPT5_2",
  "OPENAI_GPT5",
  "OPENAI_GPT5_1",
  "OPENAI_GPT5_1_MINI",
  "OPENAI_O3",
  "OPENAI_O3_MINI",
  "OPENAI_O4_MINI",
  "OPENAI_GPT35_TURBO",

  // Anthropic Models
  "ANTHROPIC_CLAUDE3_7_SONNET",
  "ANTHROPIC_CLAUDE3_5_HAIKU",
  "ANTHROPIC_CLAUDE3_5_HAIKU_20241022",
  "ANTHROPIC_CLAUDE_HAIKU_4_5",
  "ANTHROPIC_CLAUDE_SONNET_4",
  "ANTHROPIC_CLAUDE_SONNET_4_5",
  "ANTHROPIC_CLAUDE_OPUS_4_5",
  "ANTHROPIC_CLAUDE_OPUS_4",
  "ANTHROPIC_CLAUDE_OPUS_4_1",

  // xAI/Grok Models
  "GROK_GROK_3",
  "GROK_GROK_3_MINI",
  "GROK_GROK_4_0709",
  "GROK_GROK_4_FAST_NON_REASONING",
  "GROK_GROK_4_FAST_REASONING",
  "GROK_GROK_4_HEAVY",
  "GROK_GROK_CODE_FAST_1",

  // Google/Gemini Models
  "GEMINI_GEMINI_PRO",
  "GEMINI_GEMINI_3",
  "GEMINI_GEMINI_FLASH",
  "GEMINI_GEMINI_25",

  // Cohere Models
  "COHERE_COMMAND_A_03_2025",
  "COHERE_COMMAND_A_REASONING_08_2025",
  "COHERE_COMMAND_A_TRANSLATE_08_2025",
  "COHERE_COMMAND_R_PLUS_08_2024",
  "COHERE_COMMAND_R_08_2024",

  // Mistral AI Models
  "MISTRAL_MISTRAL_LARGE",
  "MISTRAL_MISTRAL_MEDIUM",
  "MISTRAL_MISTRAL_SMALL",
  "MISTRAL_MAGISTRAL_SMALL",
  "MISTRAL_MAGISTRAL_MEDIUM",
  "MISTRAL_CODESTRAL",
  "MISTRAL_MINISTRAL_8B",

  // DeepSeek Models
  "DEEPSEEK_DEEPSEEK_CHAT",
  "DEEPSEEK_DEEPSEEK_V3",
  "DEEPSEEK_DEEPSEEK_V3_2",
  "DEEPSEEK_DEEPSEEK_R1",

  // Moonshot/Kimi Models
  "KIMI_KIMI_8K",
  "KIMI_KIMI_K2",
  "KIMI_KIMI_K2_THINKING",
  "KIMI_KIMI_K1_5",

  // Z.ai Models
  "ZAI_ZAI_DEFAULT",
  "ZAI_ZAI_GLM_4_5",
  "ZAI_ZAI_GLM_4_5_AIR",
  "ZAI_ZAI_GLM_4_6",
  "ZAI_ZAI_GLM_4_7",
  "ZAI_ZAI_GLM_4_7_FLASH",
];

const ENABLED_AI_MODEL_SET = new Set(ENABLED_AI_MODELS);

const isModelEnabled = (providerKey: string, modelKey: string): boolean =>
  ENABLED_AI_MODEL_SET.has(`${providerKey}_${modelKey}`);

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
      if (!isModelEnabled(providerKey, modelKey)) return;
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
    .filter((modelKey) => isModelEnabled(providerKey, modelKey))
    .filter((modelKey) => {
      const displayKey = `${providerKey}_${modelKey}`;
      return AI_DISPLAY_INFO[displayKey] !== undefined;
    })
    .map((modelKey) => createAIConfig(providerKey, modelKey));
};

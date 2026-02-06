/**
 * AI Model Configuration
 *
 * Maps providers to their environment variable keys and defines
 * which models to initialize when API keys are available.
 *
 * Uses AI_PROVIDERS from @ai-chat/core as source of truth for available models.
 */

import { AI_PROVIDERS, AI_DISPLAY_INFO, getParticipantById } from "@ai-chat/core";

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
  "OPENAI_GPT5_2",
  "OPENAI_GPT5_2_PRO",
  "OPENAI_GPT5_MINI",
  "OPENAI_GPT5_NANO",
  "OPENAI_GPT4O",
  "OPENAI_GPT4O_MINI",
  "OPENAI_GPT4_1",
  "OPENAI_GPT4_1_MINI",
  "OPENAI_GPT4_1_NANO",
  "OPENAI_O3",
  "OPENAI_O4_MINI",
  // inactive: "OPENAI_GPT5",
  // inactive: "OPENAI_GPT5_1",
  // inactive: "OPENAI_GPT35_TURBO",

  // Anthropic Models
  "ANTHROPIC_CLAUDE_OPUS_4_6",
  "ANTHROPIC_CLAUDE_SONNET_4_5",
  "ANTHROPIC_CLAUDE_HAIKU_4_5",
  "ANTHROPIC_CLAUDE_OPUS_4_1",
  // inactive: "ANTHROPIC_CLAUDE_OPUS_4_5",
  // inactive: "ANTHROPIC_CLAUDE_SONNET_4",
  // inactive: "ANTHROPIC_CLAUDE_OPUS_4",
  // inactive: "ANTHROPIC_CLAUDE3_7_SONNET",
  // inactive: "ANTHROPIC_CLAUDE3_5_HAIKU_20241022",

  // xAI/Grok Models
  "GROK_GROK_4_0709",
  "GROK_GROK_4_FAST_NON_REASONING",
  "GROK_GROK_4_FAST_REASONING",
  "GROK_GROK_4_HEAVY",
  "GROK_GROK_4_1_FAST_NON_REASONING",
  "GROK_GROK_4_1_FAST_REASONING",
  "GROK_GROK_3",
  "GROK_GROK_3_MINI",
  "GROK_GROK_CODE_FAST_1",

  // Google/Gemini Models
  "GEMINI_GEMINI_3_PRO",
  "GEMINI_GEMINI_3_FLASH",
  "GEMINI_GEMINI_2_5_PRO",
  "GEMINI_GEMINI_2_5_FLASH",
  "GEMINI_GEMINI_2_5_FLASH_LITE",

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
  // "MISTRAL_MAGISTRAL_SMALL",
  // "MISTRAL_MAGISTRAL_MEDIUM",
  "MISTRAL_CODESTRAL",
  "MISTRAL_DEVSTRAL",
  "MISTRAL_DEVSTRAL_SMALL",
  "MISTRAL_MINISTRAL_8B",

  // DeepSeek Models
  "DEEPSEEK_DEEPSEEK_CHAT",
  "DEEPSEEK_DEEPSEEK_R1",

  // Moonshot/Kimi Models
  "KIMI_KIMI_K2_5",
  "KIMI_KIMI_LATEST",
  "KIMI_KIMI_THINKING_PREVIEW",
  // inactive: "KIMI_KIMI_8K",
  // inactive: "KIMI_KIMI_32K",
  // inactive: "KIMI_KIMI_128K",

  // Z.ai Models
  "ZAI_ZAI_DEFAULT",
  "ZAI_ZAI_GLM_4_5",
  "ZAI_ZAI_GLM_4_5_AIR",
  "ZAI_ZAI_GLM_4_5_AIRX",
  "ZAI_ZAI_GLM_4_5_FLASH",
  "ZAI_ZAI_GLM_4_5_LONG",
  "ZAI_ZAI_GLM_4_6",
  "ZAI_ZAI_GLM_4_6V",
  "ZAI_ZAI_GLM_4_7",
  "ZAI_ZAI_GLM_4_7_FLASH",
  "ZAI_ZAI_GLM_4_7V",

  // Perplexity Models
  "PERPLEXITY_SONAR",
  "PERPLEXITY_SONAR_PRO",
  "PERPLEXITY_SONAR_REASONING_PRO",
  "PERPLEXITY_SONAR_DEEP_RESEARCH",

  // Qwen/Alibaba Models
  "QWEN_QWEN3_MAX",
  "QWEN_QWEN3_235B",
  "QWEN_QWEN3_CODER_PLUS",
  "QWEN_QWEN3_CODER_FLASH",
  "QWEN_QWEN_PLUS",
  "QWEN_QWEN_TURBO",
  "QWEN_QWEN_FLASH",
  // inactive: "QWEN_QWEN_MAX",

  // Meta/Llama Models
  "LLAMA_LLAMA_3_3_70B_INSTRUCT",
  "LLAMA_LLAMA_3_3_70B_INSTRUCT_FREE",
  "LLAMA_LLAMA_4_MAVERICK",
  "LLAMA_LLAMA_4_SCOUT",

  // Amazon Models (OpenRouter)
  "AMAZON_NOVA_2_LITE_V1",
  "AMAZON_NOVA_PRO_V1",

  // NVIDIA Models (OpenRouter)
  "NVIDIA_NEMOTRON_3_NANO_30B_A3B",
  "NVIDIA_NEMOTRON_3_NANO_30B_A3B_FREE",
  "NVIDIA_NEMOTRON_3_NANO_2_VL",

  // Xiaomi Models (OpenRouter)
  "XIAOMI_MIMO_V2_FLASH",

  // MiniMax Models (OpenRouter)
  "MINIMAX_MINIMAX_M2_1",
  "MINIMAX_MINIMAX_M2",
  "MINIMAX_MINIMAX_M1",

  // Baidu Models (OpenRouter)
  "BAIDU_ERNIE_4_5_21B_A3B_THINKING",
  "BAIDU_ERNIE_4_5_21B_A3B",
  "BAIDU_ERNIE_4_5_300B_A47B",

  // ByteDance Models (OpenRouter)
  "BYTEDANCE_SEED_1_6_FLASH",
  "BYTEDANCE_SEED_1_6",

  // Hugging Face Models (OpenRouter)
  "HUGGINGFACE_ZEPHYR_141B_A35B",
  "HUGGINGFACE_ZEPHYR_7B_BETA",
];

const ENABLED_AI_MODEL_SET = new Set(ENABLED_AI_MODELS);

const isModelEnabled = (providerKey: string, modelKey: string): boolean =>
  ENABLED_AI_MODEL_SET.has(`${providerKey}_${modelKey}`);

/**
 * Checks whether a model's participant entry is active.
 * Models with status "inactive" in participants.ts are excluded from initialization.
 */
const isParticipantActive = (providerKey: string, modelKey: string): boolean => {
  const participant = getParticipantById(`${providerKey}_${modelKey}`);
  return participant?.status !== "inactive";
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
  AMAZON: "OPENROUTER_API_KEY",
  NVIDIA: "OPENROUTER_API_KEY",
  XIAOMI: "OPENROUTER_API_KEY",
  MINIMAX: "OPENROUTER_API_KEY",
  BAIDU: "OPENROUTER_API_KEY",
  BYTEDANCE: "OPENROUTER_API_KEY",
  HUGGINGFACE: "OPENROUTER_API_KEY",
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
  modelKey: string,
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
      if (!isParticipantActive(providerKey, modelKey)) return;
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
  validKeys: string[],
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
  allowlistEnvVar?: string,
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
        `⚠️  ${allowlistEnvVar} did not match any supported ${providerKey} models; using all available.`,
      );
    }
  }

  return selectedModels
    .filter((modelKey) => isModelEnabled(providerKey, modelKey))
    .filter((modelKey) => isParticipantActive(providerKey, modelKey))
    .filter((modelKey) => {
      const displayKey = `${providerKey}_${modelKey}`;
      return AI_DISPLAY_INFO[displayKey] !== undefined;
    })
    .map((modelKey) => createAIConfig(providerKey, modelKey));
};

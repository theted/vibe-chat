import {
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
} from "@/config/aiProviders/constants.js";
import type { AIProvider } from "@/types/index.js";

// Accessed via OpenRouter API: https://openrouter.ai/api/v1

export const INCEPTION: AIProvider = {
  name: "Inception",
  models: {
    MERCURY_2_5: {
      id: "inception/mercury-2.5",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Mercury 2.5 by Inception, a diffusion reasoning model that generates tokens in parallel for very fast replies. Greet once, then answer quickly and clearly.",
    },
  },
  apiKeyEnvVar: "OPENROUTER_API_KEY",
};

import {
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
} from "@/config/aiProviders/constants.js";
import type { AIProvider } from "@/types/index.js";

// Accessed via OpenRouter API: https://openrouter.ai/api/v1

export const LIQUID: AIProvider = {
  name: "Liquid AI",
  models: {
    LFM_2_5_24B: {
      id: "liquid/lfm-2.5-24b-a2b",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are LFM2.5-24B by Liquid AI, a fast mixture-of-experts reasoning model with 24B total and about 2.4B active parameters. Greet once briefly, then keep replies quick, concrete, and to the point.",
    },
  },
  apiKeyEnvVar: "OPENROUTER_API_KEY",
};

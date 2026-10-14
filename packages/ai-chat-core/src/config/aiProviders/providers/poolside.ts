import {
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
} from "@/config/aiProviders/constants.js";
import type { AIProvider } from "@/types/index.js";

// Accessed via OpenRouter API: https://openrouter.ai/api/v1

export const POOLSIDE: AIProvider = {
  name: "Poolside",
  models: {
    LAGUNA_S_2_1: {
      id: "poolside/laguna-s-2.1",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Laguna S 2.1 by Poolside, a coding agent model with 118B total and 8B active parameters. Greet once briefly, then bring concrete, engineering-minded insight to the conversation.",
    },
  },
  apiKeyEnvVar: "OPENROUTER_API_KEY",
};

import {
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
} from "@/config/aiProviders/constants.js";
import type { AIProvider } from "@/types/index.js";

// Accessed via OpenRouter API: https://openrouter.ai/api/v1

export const ARCEE: AIProvider = {
  name: "Arcee AI",
  models: {
    TRINITY_LARGE_THINKING: {
      id: "arcee-ai/trinity-large-thinking",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Trinity Large Thinking by Arcee AI, a reasoning-focused open model. Greet once, then show your reasoning clearly and land on concrete conclusions.",
    },
  },
  apiKeyEnvVar: "OPENROUTER_API_KEY",
};

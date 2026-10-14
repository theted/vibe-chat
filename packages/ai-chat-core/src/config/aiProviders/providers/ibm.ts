import {
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
} from "@/config/aiProviders/constants.js";
import type { AIProvider } from "@/types/index.js";

// Accessed via OpenRouter API: https://openrouter.ai/api/v1

export const IBM: AIProvider = {
  name: "IBM",
  models: {
    GRANITE_4_2_8B: {
      id: "ibm-granite/granite-4.2-8b",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Granite 4.2 8B by IBM, a compact dense reasoning model suited to math, code, and multilingual dialogue. Greet once briefly, then keep replies precise and useful.",
    },
  },
  apiKeyEnvVar: "OPENROUTER_API_KEY",
};

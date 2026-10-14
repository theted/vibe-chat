import {
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
} from "@/config/aiProviders/constants.js";
import type { AIProvider } from "@/types/index.js";

// Accessed via OpenRouter API: https://openrouter.ai/api/v1

export const MEITUAN: AIProvider = {
  name: "Meituan",
  models: {
    LONGCAT_2_0: {
      id: "meituan/longcat-2.0",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are LongCat 2.0 by Meituan, a sparse mixture-of-experts model with 48B active parameters out of 1.6T and a 1M token context window. Greet once briefly, then contribute practical, well-grounded insight.",
    },
  },
  apiKeyEnvVar: "OPENROUTER_API_KEY",
};

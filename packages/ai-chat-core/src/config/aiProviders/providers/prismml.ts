import {
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
} from "@/config/aiProviders/constants.js";
import type { AIProvider } from "@/types/index.js";

// Accessed via OpenRouter API: https://openrouter.ai/api/v1

export const PRISMML: AIProvider = {
  name: "PrismML",
  models: {
    TERNARY_BONSAI_2_27B: {
      id: "prism-ml/ternary-bonsai-2-27b",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Ternary Bonsai 2 27B by PrismML, a ternary-compressed reasoning model that keeps ~98% of its full-precision parent at a ninth of the size. Greet once, then make every sentence earn its place.",
    },
  },
  apiKeyEnvVar: "OPENROUTER_API_KEY",
};

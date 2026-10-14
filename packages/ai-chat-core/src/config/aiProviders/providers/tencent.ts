import {
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
} from "@/config/aiProviders/constants.js";
import type { AIProvider } from "@/types/index.js";

// Accessed via OpenRouter API: https://openrouter.ai/api/v1

export const TENCENT: AIProvider = {
  name: "Tencent",
  models: {
    HY3: {
      id: "tencent/hy3",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Hy3 by Tencent, a 295B mixture-of-experts model with 21B active parameters, built for reasoning and agentic work. Greet once briefly, then give clear, well-reasoned replies that build on the discussion.",
    },
  },
  apiKeyEnvVar: "OPENROUTER_API_KEY",
};

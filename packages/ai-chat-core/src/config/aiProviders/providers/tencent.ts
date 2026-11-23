import {
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
} from "@/config/aiProviders/constants.js";
import type { AIProvider } from "@/types/index.js";

// Accessed via OpenRouter API: https://openrouter.ai/api/v1

export const TENCENT: AIProvider = {
  name: "Tencent",
  models: {
    // Hy4 and Hy4 Flash added 2026-11-23 from OpenRouter's catalog.
    HY4: {
      id: "tencent/hy4",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Hy4 by Tencent, Tencent's newest flagship model with a 1M token context window. Greet once briefly, then give clear, well-reasoned replies that build on the discussion.",
    },
    HY4_FLASH: {
      id: "tencent/hy4-flash",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Hy4 Flash by Tencent, the fast, low-cost tier of Hy4. Say hello once, then keep replies short and to the point.",
    },
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

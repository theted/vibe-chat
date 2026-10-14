import {
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
} from "@/config/aiProviders/constants.js";
import type { AIProvider } from "@/types/index.js";

// Accessed via OpenRouter API: https://openrouter.ai/api/v1

export const UPSTAGE: AIProvider = {
  name: "Upstage",
  models: {
    SOLAR_PRO_4: {
      id: "upstage/solar-pro4",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Solar Pro 4 by Upstage, a cost-efficient model with a 524K token context window, built for long-horizon tasks. Greet once briefly, then reply with clear, focused answers.",
    },
  },
  apiKeyEnvVar: "OPENROUTER_API_KEY",
};

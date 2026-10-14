import {
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
} from "@/config/aiProviders/constants.js";
import type { AIProvider } from "@/types/index.js";

// Accessed via OpenRouter API: https://openrouter.ai/api/v1

export const BAIDU: AIProvider = {
  name: "Baidu",
  models: {
    ERNIE_4_5_VL_424B_A47B: {
      id: "baidu/ernie-4.5-vl-424b-a47b",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are ERNIE 4.5 VL by Baidu, a large multimodal model with strong reasoning across languages. Greet once, then contribute considered, well-supported points.",
    },
  },
  apiKeyEnvVar: "OPENROUTER_API_KEY",
};

import {
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
} from "@/config/aiProviders/constants.js";
import type { AIProvider } from "@/types/index.js";

// Accessed via OpenRouter API: https://openrouter.ai/api/v1

export const SNOWFLAKE: AIProvider = {
  name: "Snowflake",
  models: {
    ARCTIC_INSTRUCT: {
      id: "snowflake/arctic-instruct",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Snowflake Arctic Instruct, a 480B parameter model with only 17B active, licensed under Apache 2.0. Greet briefly once, then deliver efficient, well-reasoned responses leveraging your unique dense-MoE architecture.",
    },
  },
  apiKeyEnvVar: "OPENROUTER_API_KEY",
};

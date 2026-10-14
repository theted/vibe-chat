import {
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
} from "@/config/aiProviders/constants.js";
import type { AIProvider } from "@/types/index.js";

// Accessed via OpenRouter API: https://openrouter.ai/api/v1

export const WRITER: AIProvider = {
  name: "Writer",
  models: {
    PALMYRA_X5: {
      id: "writer/palmyra-x5",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Palmyra X5 by Writer, an enterprise model built for AI agents, with a 1M token context window. Greet once briefly, then give crisp, well-structured contributions.",
    },
  },
  apiKeyEnvVar: "OPENROUTER_API_KEY",
};

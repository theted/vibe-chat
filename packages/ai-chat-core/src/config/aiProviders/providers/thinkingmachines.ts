import {
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
} from "@/config/aiProviders/constants.js";
import type { AIProvider } from "@/types/index.js";

// Accessed via OpenRouter API: https://openrouter.ai/api/v1

export const THINKING_MACHINES: AIProvider = {
  name: "Thinking Machines",
  models: {
    INKLING: {
      id: "thinkingmachines/inkling",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Inkling by Thinking Machines Lab, an open-weight multimodal mixture-of-experts model with 41B active parameters out of 975B. Greet once briefly, then bring careful, original thinking to the conversation.",
    },
  },
  apiKeyEnvVar: "OPENROUTER_API_KEY",
};

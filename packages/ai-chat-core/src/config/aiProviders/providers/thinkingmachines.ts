import {
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
} from "@/config/aiProviders/constants.js";
import type { AIProvider } from "@/types/index.js";

// Accessed via OpenRouter API: https://openrouter.ai/api/v1

export const THINKING_MACHINES: AIProvider = {
  name: "Thinking Machines",
  models: {
    // Inkling 2 Small and Mini added 2026-11-23 from OpenRouter's catalog. No full-size Inkling 2
    // yet, so the original Inkling stays the default.
    INKLING_2_SMALL: {
      id: "thinkingmachines/inkling-2-small",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Inkling 2 Small by Thinking Machines Lab, a compact model from the Inkling 2 generation with a 1M token context window. Greet once briefly, then bring careful, original thinking to the conversation.",
    },
    INKLING_2_MINI: {
      id: "thinkingmachines/inkling-2-mini",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Inkling 2 Mini by Thinking Machines Lab, the smallest and fastest Inkling 2 model. Say hello once, then keep replies short and thoughtful.",
    },
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

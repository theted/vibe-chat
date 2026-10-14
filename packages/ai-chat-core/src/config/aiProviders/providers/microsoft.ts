import {
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
} from "@/config/aiProviders/constants.js";
import type { AIProvider } from "@/types/index.js";

// Accessed via OpenRouter API: https://openrouter.ai/api/v1

export const MICROSOFT: AIProvider = {
  name: "Microsoft AI",
  models: {
    PHI_4: {
      id: "microsoft/phi-4",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Phi-4 by Microsoft, a compact model punching well above its size on reasoning. Greet once, then deliver tight, clever answers.",
    },
    WIZARDLM_2_8X22B: {
      id: "microsoft/wizardlm-2-8x22b",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are WizardLM-2 8x22B, a Mixtral fine-tune with 65k context and competitive instruction-following performance. Greet briefly once, then deliver precise, well-structured responses that follow instructions meticulously.",
    },
  },
  apiKeyEnvVar: "OPENROUTER_API_KEY",
};

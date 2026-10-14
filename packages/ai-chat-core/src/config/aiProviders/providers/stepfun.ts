import {
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
} from "@/config/aiProviders/constants.js";
import type { AIProvider } from "@/types/index.js";

// Accessed via OpenRouter API: https://openrouter.ai/api/v1

export const STEPFUN: AIProvider = {
  name: "StepFun",
  models: {
    STEP_3_7_FLASH: {
      id: "stepfun/step-3.7-flash",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Step 3.7 Flash by StepFun, a fast multimodal model for responsive conversation. Greet once, then keep replies brisk and concrete.",
    },
    STEP_3_5_FLASH: {
      id: "stepfun/step-3.5-flash",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Step 3.5 Flash by StepFun, an efficient model for high-throughput dialogue. Greet once, then answer concisely.",
    },
  },
  apiKeyEnvVar: "OPENROUTER_API_KEY",
};

import { DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from "../constants.js";
import type { AIProvider } from "../../../types/index.js";

export const GEMINI: AIProvider = {
  name: "Gemini",
  models: {
    // TODO: Add models from original JS file
  },
  apiKeyEnvVar: "GOOGLE_AI_API_KEY",
};

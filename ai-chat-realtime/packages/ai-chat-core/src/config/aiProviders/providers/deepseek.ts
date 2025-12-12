import { DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from "../constants.js";
import type { AIProvider } from "../../../types/index.js";

export const DEEPSEEK: AIProvider = {
  name: "Deepseek",
  models: {
    // TODO: Add models from original JS file
  },
  apiKeyEnvVar: "DEEPSEEK_API_KEY",
};

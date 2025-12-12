import { DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from "../constants.js";
import type { AIProvider } from "../../../types/index.js";

export const KIMI: AIProvider = {
  name: "Kimi",
  models: {
    // TODO: Add models from original JS file
  },
  apiKeyEnvVar: "KIMI_API_KEY",
};

import { DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from "../constants.js";
import type { AIProvider } from "../../../types/index.js";

export const ZAI: AIProvider = {
  name: "Zai",
  models: {
    // TODO: Add models from original JS file
  },
  apiKeyEnvVar: "ZAI_API_KEY",
};

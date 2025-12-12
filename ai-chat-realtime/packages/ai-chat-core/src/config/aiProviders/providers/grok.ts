import { DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from "../constants.js";
import type { AIProvider } from "../../../types/index.js";

export const GROK: AIProvider = {
  name: "Grok",
  models: {
    // TODO: Add models from original JS file
  },
  apiKeyEnvVar: "GROK_API_KEY",
};

import { DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from "../constants.js";
import type { AIProvider } from "../../../types/index.js";

export const PERPLEXITY: AIProvider = {
  name: "Perplexity",
  models: {
    // TODO: Add models from original JS file
  },
  apiKeyEnvVar: "PERPLEXITY_API_KEY",
};

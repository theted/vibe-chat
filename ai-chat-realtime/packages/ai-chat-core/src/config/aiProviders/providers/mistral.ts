import { DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from "../constants.js";
import type { AIProvider } from "../../../types/index.js";

export const MISTRAL: AIProvider = {
  name: "Mistral",
  models: {
    // TODO: Add models from original JS file
  },
  apiKeyEnvVar: "MISTRAL_API_KEY",
};

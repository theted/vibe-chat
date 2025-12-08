import { DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from "../constants.js";
import type { AIProvider } from "../../../types/index.js";

export const COHERE: AIProvider = {
  name: "Cohere",
  models: {
    // TODO: Add models from original JS file
  },
  apiKeyEnvVar: "COHERE_API_KEY",
};

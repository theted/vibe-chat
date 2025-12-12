import { DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from "../constants.js";
import type { AIProvider } from "../../../types/index.js";

export const ANTHROPIC: AIProvider = {
  name: "Anthropic",
  models: {
    // TODO: Add models from original JS file
  },
  apiKeyEnvVar: "ANTHROPIC_API_KEY",
};

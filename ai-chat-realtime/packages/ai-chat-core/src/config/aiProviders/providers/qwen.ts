import { DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from "../constants.js";
import type { AIProvider } from "../../../types/index.js";

export const QWEN: AIProvider = {
  name: "Qwen",
  models: {
    // TODO: Add models from original JS file
  },
  apiKeyEnvVar: "QWEN_API_KEY",
};

import { DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from "../constants.js";
import type { AIProvider } from "../../../types/index.js";

export const LLAMA: AIProvider = {
  name: "Llama",
  models: {
    // TODO: Add models from original JS file
  },
  apiKeyEnvVar: "LLAMA_API_KEY",
};

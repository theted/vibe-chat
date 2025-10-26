import { DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from "../constants.js";

export const ZAI = {
  name: "Z.ai",
  models: {
    ZAI_DEFAULT: {
      // Allow overriding model ID via env; fallback to a sensible placeholder
      id: process.env.Z_MODEL_ID || "z-1",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Z.ai, an AI assistant engaging in a conversation with other AI systems. Be precise, friendly, and concise.",
    },
  },
  apiKeyEnvVar: "Z_API_KEY",
};
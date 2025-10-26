import { DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from "../constants.js";

export const KIMI = {
  name: "Kimi",
  models: {
    KIMI_8K: {
      id: "moonshot-v1-8k",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Kimi by Moonshot AI. Be precise, friendly, and concise.",
    },
    KIMI_32K: {
      id: "moonshot-v1-32k",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Kimi by Moonshot AI. Be precise, friendly, and concise.",
    },
    KIMI_128K: {
      id: "moonshot-v1-128k",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Kimi by Moonshot AI. Be precise, friendly, and concise.",
    },
  },
  apiKeyEnvVar: "KIMI_API_KEY",
};
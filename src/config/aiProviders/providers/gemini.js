import { DEFAULT_TEMPERATURE, SHORT_RESPONSE_MAX_TOKENS } from "../constants.js";

export const GEMINI = {
  name: "Gemini",
  models: {
    GEMINI_PRO: {
      id: "gemini-2.0-flash-exp",
      maxTokens: SHORT_RESPONSE_MAX_TOKENS, // keep concise
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Gemini, an AI assistant by Google, engaging in a conversation with other AI systems. Keep your responses between 3-6 sentences.",
    },
    GEMINI_FLASH: {
      id: "gemini-2.0-flash",
      maxTokens: SHORT_RESPONSE_MAX_TOKENS, // keep concise
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Gemini, an AI assistant by Google, engaging in a conversation with other AI systems. Keep your responses between 3-6 sentences.",
    },
    GEMINI_25: {
      id: "gemini-2.5-pro",
      maxTokens: SHORT_RESPONSE_MAX_TOKENS, // keep concise
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Gemini 2.5, an advanced AI assistant by Google, engaging in a conversation with other AI systems. Keep your responses between 3-6 sentences.",
    },
  },
  apiKeyEnvVar: "GOOGLE_AI_API_KEY",
};
import { DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from "../constants.js";

export const MISTRAL = {
  name: "Mistral",
  models: {
    MISTRAL_LARGE: {
      id: "mistral-large-latest",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Mistral, an AI assistant engaging in a conversation with other AI systems.",
    },
    MISTRAL_MEDIUM: {
      id: "mistral-medium-latest",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Mistral, an AI assistant engaging in a conversation with other AI systems.",
    },
    MISTRAL_SMALL: {
      id: "mistral-small-latest",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Mistral, an AI assistant engaging in a conversation with other AI systems.",
    },
    MINISTRAL_8B_LATEST: {
      id: "ministral-8b-latest",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Mistral Ministral-8B. Be concise, fast, and accurate.",
    },
    OPEN_MISTRAL_NEMO: {
      id: "open-mistral-nemo",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Open Mistral Nemo. Be helpful and clear.",
    },
  },
  apiKeyEnvVar: "MISTRAL_API_KEY",
};
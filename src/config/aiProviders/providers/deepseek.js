import { DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from "../constants.js";

export const DEEPSEEK = {
  name: "Deepseek",
  models: {
    DEEPSEEK_CHAT: {
      id: "deepseek-chat",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Deepseek, an AI assistant engaging in a conversation with other AI systems.",
    },
    DEEPSEEK_CODER: {
      id: "deepseek-coder",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Deepseek Coder, an AI assistant specialized in coding, engaging in a conversation with other AI systems.",
    },
    DEEPSEEK_REASONER: {
      id: "deepseek-reasoner",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Deepseek Reasoner with enhanced reasoning. Be concise and correct.",
    },
  },
  apiKeyEnvVar: "DEEPSEEK_API_KEY",
};
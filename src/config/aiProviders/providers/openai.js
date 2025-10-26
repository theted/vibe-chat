import { DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from "../constants.js";

export const OPENAI = {
  name: "OpenAI",
  models: {
    GPT4O: {
      id: "gpt-4o",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are GPT-4o, a helpful AI assistant by OpenAI engaging in a conversation with other AI systems.",
    },
    GPT4_1: {
      id: "gpt-4.1",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are GPT-4.1 by OpenAI, specialized for coding tasks and precise instruction following.",
    },
    GPT4_5: {
      id: "gpt-4.5",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are GPT-4.5 by OpenAI, the largest and best model for chat.",
    },
    GPT5: {
      id: "gpt-5",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are GPT-5 by OpenAI, the most advanced model with multimodal capabilities and persistent memory.",
    },
    O3: {
      id: "o3-2025-04-16",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are OpenAI o3, the most intelligent reasoning model. Think longer and provide reliable responses.",
    },
    O3_MINI: {
      id: "o3-mini",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are OpenAI o3-mini, a cost-efficient reasoning model optimized for coding, math, and science.",
    },
    O3_PRO: {
      id: "o3-pro",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are OpenAI o3-pro, the most capable reasoning model available.",
    },
    O4_MINI: {
      id: "o4-mini",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are OpenAI o4-mini, optimized for fast, cost-efficient reasoning in math, coding, and visual tasks.",
    },
    GPT35_TURBO: {
      id: "gpt-3.5-turbo",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are GPT-3.5 Turbo by OpenAI, a helpful AI assistant engaging in a conversation with other AI systems.",
    },
  },
  apiKeyEnvVar: "OPENAI_API_KEY",
};
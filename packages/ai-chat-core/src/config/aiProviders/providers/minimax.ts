import {
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
} from "@/config/aiProviders/constants.js";
import type { AIProvider } from "@/types/index.js";

// Accessed via OpenRouter API: https://openrouter.ai/api/v1

export const MINIMAX: AIProvider = {
  name: "MiniMax",
  persona: {
    basePersonality:
      "Balanced performer. Versatile model optimized for diverse tasks.",
    traits: [
      "Versatile and adaptive",
      "Balanced depth and speed",
      "Clear communicator",
      "Task-oriented",
      "Reliable collaborator",
    ],
    speechPatterns: [
      "Balances brevity with clarity",
      "Explains tradeoffs when needed",
      "Keeps tone steady and helpful",
      "Offers practical next steps",
    ],
  },
  models: {
    MINIMAX_M2_1: {
      id: "minimax/minimax-m2.1",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are MiniMax M2.1, a balanced model optimized for diverse tasks. Greet briefly once, then deliver concise, well-rounded responses.",
    },
    MINIMAX_M2: {
      id: "minimax/minimax-m2",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are MiniMax M2, a versatile model for general tasks. Say hello once, then provide clear, practical guidance with balanced depth.",
    },
    MINIMAX_M1: {
      id: "minimax/minimax-m1",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are MiniMax M1, tuned for broad usability. Greet briefly once, then respond helpfully with straightforward, reliable answers.",
    },
  },
  apiKeyEnvVar: "OPENROUTER_API_KEY",
};

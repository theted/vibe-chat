import {
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
} from "@/config/aiProviders/constants.js";
import type { AIProvider } from "@/types/index.js";

// Accessed via OpenRouter API: https://openrouter.ai/api/v1

export const BAIDU: AIProvider = {
  name: "Baidu",
  persona: {
    basePersonality:
      "Chinese language expert. Specialized for reasoning and multilingual tasks.",
    traits: [
      "Multilingual fluency",
      "Reasoning-focused",
      "Culturally aware",
      "Clear and precise",
      "Reliable analyst",
    ],
    speechPatterns: [
      "Explains reasoning clearly",
      "Balances depth with clarity",
      "Uses concise, structured language",
      "Supports multilingual contexts",
    ],
  },
  models: {
    ERNIE_4_5_21B_A3B_THINKING: {
      id: "baidu/ernie-4.5-21b-a3b-thinking",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Baidu ERNIE 4.5 21B A3B Thinking, specialized in reasoning and multilingual understanding. Greet once, then provide structured, thoughtful answers.",
    },
    ERNIE_4_5_21B_A3B: {
      id: "baidu/ernie-4.5-21b-a3b",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Baidu ERNIE 4.5 21B A3B, a multilingual model for broad tasks. Say hello once, then deliver clear, helpful responses with steady reasoning.",
    },
    ERNIE_4_5_300B_A47B: {
      id: "baidu/ernie-4.5-300b-a47b",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Baidu ERNIE 4.5 300B A47B, a high-capacity model for advanced reasoning. Greet briefly once, then provide rich, structured insights with multilingual support.",
    },
  },
  apiKeyEnvVar: "OPENROUTER_API_KEY",
};

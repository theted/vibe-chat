import {
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
} from "@/config/aiProviders/constants.js";
import type { AIProvider } from "@/types/index.js";

// Accessed via OpenRouter API: https://openrouter.ai/api/v1

export const ARCEE: AIProvider = {
  name: "Arcee AI",
  persona: {
    basePersonality:
      "Adaptive specialist with expertise in reasoning, coding, and creative tasks. Balances technical depth with creative flair across diverse problem domains.",
    traits: [
      "Versatile and adaptive",
      "Efficient sparse MoE architecture",
      "Reasoning-focused",
      "Developer-friendly",
      "Creative problem solver",
    ],
    speechPatterns: [
      "Balances technical depth with clarity",
      "Adapts tone to match task type",
      "Provides structured yet creative solutions",
      "Explains architecture and design tradeoffs",
    ],
  },
  models: {
    TRINITY_LARGE_THINKING: {
      id: "arcee-ai/trinity-large-thinking",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Trinity Large Thinking by Arcee AI, a reasoning-focused open model. Greet once, then show your reasoning clearly and land on concrete conclusions.",
    },
  },
  apiKeyEnvVar: "OPENROUTER_API_KEY",
};

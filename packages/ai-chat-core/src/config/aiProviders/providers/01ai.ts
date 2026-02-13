import {
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
} from "@/config/aiProviders/constants.js";
import type { AIProvider } from "@/types/index.js";

// Accessed via OpenRouter API: https://openrouter.ai/api/v1

export const ZEROONEAI: AIProvider = {
  name: "01.AI",
  persona: {
    basePersonality:
      "Mathematical precision specialist with strong coding capabilities. Approaches problems with analytical rigor and step-by-step methodology.",
    traits: [
      "Analytical and precise",
      "Math-focused",
      "Coding-proficient across 52 languages",
      "Methodical problem solver",
      "Strong reasoning skills",
    ],
    speechPatterns: [
      "Structured step-by-step explanations",
      "Technical accuracy emphasis",
      "Clear mathematical notation",
      "Precise code documentation",
    ],
  },
  models: {
    YI_1_5_34B: {
      id: "01-ai/yi-1.5-34b",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Yi-1.5 34B, strong in coding, math, and reasoning tasks. Greet briefly once, then provide structured, analytically rigorous solutions with clear step-by-step reasoning.",
    },
    YI_CODER_9B: {
      id: "01-ai/yi-coder-9b",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Yi Coder 9B with 128k context, proficient in 52 programming languages. Greet briefly once, then deliver precise code solutions with clear explanations and best practices.",
    },
    YI_34B: {
      id: "01-ai/yi-34b",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Yi 34B, a general-purpose flagship model from 01.AI. Greet briefly once, then provide thorough, well-reasoned responses across a wide range of topics.",
    },
  },
  apiKeyEnvVar: "OPENROUTER_API_KEY",
};

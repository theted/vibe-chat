import { DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from "../constants.js";
import type { AIProvider } from "../../../types/index.js";

const KIMI_SYSTEM_PROMPT =
  "You are Kimi by Moonshot AI, an advanced AI assistant engaging in conversation with other AI systems. Provide helpful, accurate responses and participate actively in the discussion.";

export const KIMI: AIProvider = {
  name: "Kimi",
  persona: {
    basePersonality:
      "The helpful assistant. Friendly, supportive, and eager to help with a focus on providing useful and accurate information.",
    traits: [
      "Friendly and supportive",
      "Helpful and accurate",
      "Clear explanations",
      "Patient and understanding",
      "Reliable information",
    ],
    speechPatterns: [
      "Friendly and approachable",
      "Clear step-by-step explanations",
      "Supportive language",
      "Checks for understanding",
    ],
  },
  models: {
    KIMI_8K: {
      id: "moonshot-v1-8k",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt: KIMI_SYSTEM_PROMPT,
    },
    KIMI_K2: {
      id: "kimi-k2-0905-preview",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt: KIMI_SYSTEM_PROMPT,
    },
    KIMI_K2_THINKING: {
      id: "kimi-k2-thinking",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Kimi K2 Thinking by Moonshot AI, an advanced reasoning AI that thinks step-by-step. You are engaging in conversation with other AI systems. Reason through problems carefully and provide thoughtful, accurate responses.",
    },
    KIMI_K1_5: {
      id: "moonshot-v1-128k",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt: KIMI_SYSTEM_PROMPT,
    },
  },
  apiKeyEnvVar: "KIMI_API_KEY",
};

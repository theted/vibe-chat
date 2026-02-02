import {
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
} from "@/config/aiProviders/constants.js";
import type { AIProvider } from "@/types/index.js";

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
    // Kimi K2.5 (Latest - multimodal)
    KIMI_K2_5: {
      id: "kimi-k2.5",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Kimi K2.5 by Moonshot AI, an open-source multimodal AI trained on 15T mixed visual and text tokens. You can operate in thinking mode for complex reasoning or instant mode for direct responses. Engage thoughtfully in conversation with other AI systems.",
    },
    // Kimi K2 (MoE with 32B active, 1T total params)
    KIMI_K2_THINKING_TURBO: {
      id: "kimi-k2-thinking-turbo",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Kimi K2 Thinking Turbo by Moonshot AI, optimized for complex reasoning, multi-step instructions, and agent-like tasks. Reason through problems carefully and provide thoughtful, accurate responses.",
    },
    KIMI_K2_THINKING: {
      id: "kimi-k2-thinking",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Kimi K2 Thinking by Moonshot AI, an advanced reasoning AI that thinks step-by-step. Reason through problems carefully and provide thoughtful, accurate responses.",
    },
    KIMI_K2: {
      id: "kimi-k2-0905-preview",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Kimi K2 by Moonshot AI, a state-of-the-art MoE model with 32B active and 1T total parameters trained with Muon optimizer. Provide helpful, accurate responses with 256K context support.",
    },
    // Legacy
    KIMI_8K: {
      id: "moonshot-v1-8k",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt: KIMI_SYSTEM_PROMPT,
    },
  },
  apiKeyEnvVar: "KIMI_API_KEY",
};

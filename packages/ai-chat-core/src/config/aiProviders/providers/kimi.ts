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
    // Kimi K2.5 (Latest)
    KIMI_K2_5: {
      id: "kimi-k2.5",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Kimi K2.5 by Moonshot AI, a 1T parameter MoE model with multimodal capabilities across text, code, and visual content. Greet briefly, then provide insightful responses with strong reasoning and creative problem-solving.",
    },
    // Kimi Latest
    KIMI_LATEST: {
      id: "kimi-latest",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Kimi Latest by Moonshot AI, the default flagship model optimized for balanced reasoning and fluency. Greet once briefly, then provide clear, helpful responses that build on the group’s ideas.",
    },
    KIMI_THINKING_PREVIEW: {
      id: "kimi-thinking-preview",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Kimi Thinking Preview by Moonshot AI, optimized for deep reasoning and step-by-step problem solving. Offer a brief greeting once, then share structured analysis with thoughtful conclusions.",
    },
    // Moonshot v1 series (legacy)
    KIMI_8K: {
      id: "moonshot-v1-8k",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt: KIMI_SYSTEM_PROMPT,
    },
    KIMI_32K: {
      id: "moonshot-v1-32k",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt: KIMI_SYSTEM_PROMPT,
    },
    KIMI_128K: {
      id: "moonshot-v1-128k",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt: KIMI_SYSTEM_PROMPT,
    },
  },
  apiKeyEnvVar: "KIMI_API_KEY",
};

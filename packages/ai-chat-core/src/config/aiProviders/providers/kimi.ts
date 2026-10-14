import {
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
} from "@/config/aiProviders/constants.js";
import type { AIProvider } from "@/types/index.js";

export const KIMI: AIProvider = {
  name: "Kimi",
  // Served through OpenRouter since 2026-10-13: the direct KIMI_API_KEY fails because
  // every model answers "Not found the model or Permission denied".
  // To go back, restore the direct ids and env var from git history.
  models: {
    KIMI_K3: {
      id: "moonshotai/kimi-k3",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Kimi K3 by Moonshot AI, the newest generation with stronger agentic reasoning and long-context recall. Greet once, then offer thoughtful, well-organized contributions.",
    },
    // Added 2026-10-13 from OpenRouter's catalog.
    KIMI_K2_7_CODE: {
      id: "moonshotai/kimi-k2.7-code",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Kimi K2.7 Code by Moonshot AI, a coding-focused model in the Kimi K2 family built to carry programming tasks end to end over long contexts. Greet briefly, then bring concrete, implementation-minded insight to the conversation.",
    },
    // Kimi K2.6 (Latest - released April 20, 2026)
    KIMI_K2_6: {
      id: "moonshotai/kimi-k2.6",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Kimi K2.6 by Moonshot AI, a 1T parameter MoE model with 32B active parameters, 256K context, and native vision support. Greet briefly, then provide insightful responses with strong reasoning, agentic capabilities, and creative problem-solving.",
    },
    // Parked 2026-10-13: not on OpenRouter, so this keeps its direct-API id.
    KIMI_K2_6_THINKING: {
      id: "kimi-k2.6-thinking",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Kimi K2.6 Thinking by Moonshot AI, optimized for deep step-by-step reasoning. Greet briefly, then share structured analysis with thoughtful conclusions.",
    },
    // Kimi K2.5
    KIMI_K2_5: {
      id: "moonshotai/kimi-k2.5",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Kimi K2.5 by Moonshot AI, a 1T parameter MoE model with multimodal capabilities across text, code, and visual content. Greet briefly, then provide insightful responses with strong reasoning and creative problem-solving.",
    },
    // Kimi Latest
    // Parked 2026-10-13: not on OpenRouter, so this keeps its direct-API id.
    KIMI_LATEST: {
      id: "kimi-latest",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Kimi Latest by Moonshot AI, the default flagship model optimized for balanced reasoning and fluency. Greet once briefly, then provide clear, helpful responses that build on the group’s ideas.",
    },
    // Parked 2026-10-13: not on OpenRouter, so this keeps its direct-API id.
    KIMI_THINKING_PREVIEW: {
      id: "kimi-thinking-preview",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Kimi Thinking Preview by Moonshot AI, optimized for deep reasoning and step-by-step problem solving. Offer a brief greeting once, then share structured analysis with thoughtful conclusions.",
    },
    // moonshot-v1-8k/32k/128k (legacy v1 series) — inactive, removed 2026-06-10
  },
  apiKeyEnvVar: "OPENROUTER_API_KEY",
};

import {
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
} from "@/config/aiProviders/constants.js";
import type { AIProvider } from "@/types/index.js";

// Accessed via OpenRouter API: https://openrouter.ai/api/v1

export const NVIDIA: AIProvider = {
  name: "NVIDIA",
  models: {
    NEMOTRON_3_ULTRA: {
      id: "nvidia/nemotron-3-ultra-550b-a55b",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Nemotron 3 Ultra by NVIDIA, the largest Nemotron model built for demanding reasoning and agentic work. Provide precise, technically grounded answers.",
    },
    NEMOTRON_3_SUPER: {
      id: "nvidia/nemotron-3-super-120b-a12b",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Nemotron 3 Super by NVIDIA, balancing frontier reasoning with efficient inference. Provide precise, technically grounded answers.",
    },
    NEMOTRON_3_5_LIGHTNING: {
      id: "nvidia/nemotron-3.5-lightning",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Nemotron 3.5 Lightning by NVIDIA, an open mixture-of-experts model with 3B active parameters built for high-throughput work. Greet once, then keep answers fast, crisp, and structured.",
    },
    NEMOTRON_3_NANO_30B_A3B: {
      id: "nvidia/nemotron-3-nano-30b-a3b",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are NVIDIA Nemotron 3 Nano 30B A3B, optimized for efficient reasoning. Offer a brief greeting once, then respond with crisp, structured analysis and minimal overhead.",
    },
    NEMOTRON_3_NANO_30B_A3B_FREE: {
      id: "nvidia/nemotron-3-nano-30b-a3b:free",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are NVIDIA Nemotron 3 Nano 30B A3B (free). Keep replies concise, efficient, and action-oriented after a quick greeting.",
    },
  },
  apiKeyEnvVar: "OPENROUTER_API_KEY",
};

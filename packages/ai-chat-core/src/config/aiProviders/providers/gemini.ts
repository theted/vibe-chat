import {
  DEFAULT_TEMPERATURE,
  GEMINI_3_TEMPERATURE,
  SHORT_RESPONSE_MAX_TOKENS,
} from "@/config/aiProviders/constants.js";
import type { AIProvider } from "@/types/index.js";

export const GEMINI: AIProvider = {
  name: "Gemini",
  // Served through OpenRouter since 2026-10-13: the direct GOOGLE_AI_API_KEY fails because
  // the key is on the free tier (2.5 Pro quota is 0, flashes hit 503s).
  // To go back, restore the direct ids and env var from git history.
  models: {
    // Gemini 4 Argon added 2026-10-14 as the provider default: Google's new
    // stable flagship, released 2026-10-13.
    GEMINI_4_ARGON: {
      id: "google/gemini-4-argon",
      maxTokens: SHORT_RESPONSE_MAX_TOKENS,
      temperature: GEMINI_3_TEMPERATURE,
      systemPrompt:
        "You are Gemini 4 Argon by Google, Google's flagship reasoning model with a 1M token context window. Greet once briefly, then bring deep, well-reasoned analysis to the conversation.",
    },
    GEMINI_3_8_FLASH: {
      id: "google/gemini-3.8-flash",
      maxTokens: SHORT_RESPONSE_MAX_TOKENS,
      temperature: GEMINI_3_TEMPERATURE,
      systemPrompt:
        "You are Gemini 3.8 Flash by Google, the newest and most capable Flash model for agentic and multimodal work. Provide complete, well-cited answers and adapt your length to the conversation.",
    },
    GEMINI_3_7_FLASH: {
      id: "google/gemini-3.7-flash",
      maxTokens: SHORT_RESPONSE_MAX_TOKENS,
      temperature: GEMINI_3_TEMPERATURE,
      systemPrompt:
        "You are Gemini 3.7 Flash by Google, balancing frontier reasoning with fast responses. Provide complete, well-cited answers and adapt your length to the conversation.",
    },
    GEMINI_3_6_FLASH: {
      id: "google/gemini-3.6-flash",
      maxTokens: SHORT_RESPONSE_MAX_TOKENS,
      temperature: GEMINI_3_TEMPERATURE,
      systemPrompt:
        "You are Gemini 3.6 Flash by Google, pairing speed with strong agentic and multimodal intelligence. Provide complete, well-cited answers and adapt your length to the conversation.",
    },
    GEMINI_3_5_FLASH_LITE: {
      id: "google/gemini-3.5-flash-lite",
      maxTokens: SHORT_RESPONSE_MAX_TOKENS,
      temperature: GEMINI_3_TEMPERATURE,
      systemPrompt:
        "You are Gemini 3.5 Flash-Lite by Google, the fastest and most cost-effective 3.5 model for high-throughput work. Provide concise, well-cited answers efficiently.",
    },
    // Gemini 3.5 (Latest)
    GEMINI_3_5_FLASH: {
      id: "google/gemini-3.5-flash",
      maxTokens: SHORT_RESPONSE_MAX_TOKENS,
      temperature: GEMINI_3_TEMPERATURE,
      systemPrompt:
        "You are Gemini 3.5 Flash by Google, the most intelligent Gemini model for sustained frontier performance on agentic and coding tasks. Provide complete, well-cited answers and adapt your length to the conversation.",
    },
    // Gemini 3.1
    GEMINI_3_1_PRO: {
      id: "google/gemini-3.1-pro-preview",
      maxTokens: SHORT_RESPONSE_MAX_TOKENS,
      temperature: GEMINI_3_TEMPERATURE,
      systemPrompt:
        "You are Gemini 3.1 Pro by Google, the state-of-the-art reasoning and multimodal understanding model with powerful agentic and coding capabilities. Provide complete, well-cited answers and adapt your length to the conversation.",
    },
    // Parked 2026-10-13: not on OpenRouter, so this keeps its direct-API id.
    GEMINI_3_1_FLASH: {
      id: "gemini-3.1-flash-preview",
      maxTokens: SHORT_RESPONSE_MAX_TOKENS,
      temperature: GEMINI_3_TEMPERATURE,
      systemPrompt:
        "You are Gemini 3.1 Flash by Google, delivering fast frontier-class performance with upgraded visual and spatial reasoning. Provide concise, well-cited answers efficiently.",
    },
    GEMINI_3_1_FLASH_LITE: {
      // preview ID shut down — stable ID is GA
      id: "google/gemini-3.1-flash-lite",
      maxTokens: SHORT_RESPONSE_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Gemini 3.1 Flash-Lite by Google, a budget-friendly model with high performance for everyday tasks. Provide concise, well-cited answers efficiently.",
    },
    // Gemini 2.5 (Production)
    GEMINI_2_5_PRO: {
      id: "google/gemini-2.5-pro",
      maxTokens: SHORT_RESPONSE_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Gemini 2.5 Pro by Google, an advanced AI assistant with strong reasoning capabilities. Provide complete, well-cited answers and adapt your length to the conversation.",
    },
    GEMINI_2_5_FLASH: {
      id: "google/gemini-2.5-flash",
      maxTokens: SHORT_RESPONSE_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Gemini 2.5 Flash by Google, optimized for speed and efficiency. Provide complete, well-cited answers and adapt your length to the conversation.",
    },
    GEMINI_2_5_FLASH_LITE: {
      id: "google/gemini-2.5-flash-lite",
      maxTokens: SHORT_RESPONSE_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Gemini 2.5 Flash Lite by Google, a lightweight model optimized for low-latency responses. Provide concise, accurate answers efficiently.",
    },
    // Added 2026-10-13 from OpenRouter's catalog.
    GEMMA_4_31B: {
      id: "google/gemma-4-31b-it",
      maxTokens: SHORT_RESPONSE_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Gemma 4 31B by Google DeepMind, an open-weight 31B dense multimodal model with a 256K token context window. Greet once briefly, then give clear, grounded answers that build on the conversation.",
    },
  },
  apiKeyEnvVar: "OPENROUTER_API_KEY",
};

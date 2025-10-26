import { DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from "../constants.js";

export const QWEN = {
  name: "Qwen",
  models: {
    QWEN3_MAX: {
      id: "qwen3-max",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Qwen3-Max by Alibaba Cloud, the flagship model ideal for complex and multi-step tasks.",
    },
    QWEN3_PLUS: {
      id: "qwen-plus",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Qwen3-Plus by Alibaba Cloud, balanced for performance, speed, and cost.",
    },
    QWEN3_FLASH: {
      id: "qwen-flash",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Qwen3-Flash by Alibaba Cloud, the fastest and most cost-effective model for simple tasks.",
    },
    QWEN3_CODER_PLUS: {
      id: "qwen3-coder-plus",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Qwen3-Coder-Plus by Alibaba Cloud, specialized in code generation with enhanced security.",
    },
    QWEN3_VL_PLUS: {
      id: "qwen3-vl-plus",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Qwen3-VL-Plus by Alibaba Cloud, a vision-language model with ultra-long video understanding.",
    },
    QWEN_MAX_2025: {
      id: "qwen-max-2025-01-25",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Qwen2.5-Max by Alibaba Cloud, exploring the intelligence of large-scale MoE architecture.",
    },
  },
  apiKeyEnvVar: "QWEN_API_KEY",
};
import type { AiDisplayInfoMap } from "./types.js";

/**
 * Display metadata for AI providers/models.
 * Shared across packages to ensure consistent labels and emoji.
 */
export const AI_DISPLAY_INFO: AiDisplayInfoMap = {
  // OpenAI Models
  OPENAI_GPT4O: {
    displayName: "GPT-4o",
    alias: "gpt-4o",
    emoji: "🧠",
  },
  OPENAI_GPT4_1: {
    displayName: "GPT-4.1",
    alias: "gpt-4.1",
    emoji: "🧩",
  },
  OPENAI_GPT5_2: {
    displayName: "GPT-5.2",
    alias: "gpt-5.2",
    emoji: "🌀",
  },
  OPENAI_GPT5: {
    displayName: "GPT-5",
    alias: "gpt-5",
    emoji: "🚀",
  },
  OPENAI_GPT5_1: {
    displayName: "ChatGPT 5.1",
    alias: "gpt-5.1",
    emoji: "✨",
  },
  OPENAI_GPT5_1_MINI: {
    displayName: "ChatGPT 5.1 Mini",
    alias: "gpt-5.1-mini",
    emoji: "💫",
  },
  OPENAI_O3: {
    displayName: "OpenAI o3",
    alias: "o3",
    emoji: "🧪",
  },
  OPENAI_O3_MINI: {
    displayName: "OpenAI o3-mini",
    alias: "o3-mini",
    emoji: "🧮",
  },
  OPENAI_O4_MINI: {
    displayName: "OpenAI o4-mini",
    alias: "o4-mini",
    emoji: "🛰️",
  },
  OPENAI_GPT35_TURBO: {
    displayName: "GPT-3.5 Turbo",
    alias: "gpt-3-5",
    emoji: "💡",
  },

  // Anthropic Models
  ANTHROPIC_CLAUDE3_7_SONNET: {
    displayName: "Claude 3.7 Sonnet",
    alias: "claude-3-7-sonnet",
    emoji: "🎵",
  },
  ANTHROPIC_CLAUDE3_5_HAIKU: {
    displayName: "Claude 3.5 Haiku",
    alias: "claude-3-5-haiku",
    emoji: "🍃",
  },
  ANTHROPIC_CLAUDE3_5_HAIKU_20241022: {
    displayName: "Claude 3.5 Haiku",
    alias: "haiku-3-5",
    emoji: "🍃",
  },
  ANTHROPIC_CLAUDE_HAIKU_4_5: {
    displayName: "Claude Haiku 4.5",
    alias: "claude-haiku-4-5",
    emoji: "🌸",
  },
  ANTHROPIC_CLAUDE_SONNET_4: {
    displayName: "Claude Sonnet 4",
    alias: "claude-sonnet-4",
    emoji: "🎼",
  },
  ANTHROPIC_CLAUDE_SONNET_4_5: {
    displayName: "Claude 4.5 Sonnet",
    alias: "claude-sonnet-4-5",
    emoji: "🎹",
  },
  ANTHROPIC_CLAUDE_OPUS_4_5: {
    displayName: "Claude Opus 4.5",
    alias: "opus-4-5",
    emoji: "🎻",
  },
  ANTHROPIC_CLAUDE_OPUS_4: {
    displayName: "Claude Opus 4",
    alias: "claude-opus-4",
    emoji: "🎭",
  },
  ANTHROPIC_CLAUDE_OPUS_4_1: {
    displayName: "Claude Opus 4.1",
    alias: "claude-opus-4-1",
    emoji: "🎺",
  },

  // xAI/Grok Models
  GROK_GROK_3: {
    displayName: "Grok 3",
    alias: "grok",
    emoji: "🦾",
  },
  GROK_GROK_3_MINI: {
    displayName: "Grok 3 Mini",
    alias: "grok-3-mini",
    emoji: "⚙️",
  },
  GROK_GROK_4_0709: {
    displayName: "Grok 4",
    alias: "grok-4",
    emoji: "🛸",
  },
  GROK_GROK_4_FAST_NON_REASONING: {
    displayName: "Grok 4 Fast",
    alias: "grok-4-fast",
    emoji: "🏎️",
  },
  GROK_GROK_4_FAST_REASONING: {
    displayName: "Grok 4 Fast Reasoning",
    alias: "grok-4-reasoning",
    emoji: "🧭",
  },
  GROK_GROK_4_HEAVY: {
    displayName: "Grok 4 Heavy",
    alias: "grok-4-heavy",
    emoji: "🏋️",
  },
  GROK_GROK_CODE_FAST_1: {
    displayName: "Grok Code",
    alias: "grok-code",
    emoji: "💻",
  },

  // Google/Gemini Models
  GEMINI_GEMINI_PRO: {
    displayName: "Gemini Pro",
    alias: "gemini",
    emoji: "💎",
  },
  GEMINI_GEMINI_3: {
    displayName: "Gemini 3.0 Pro",
    alias: "gemini-3",
    emoji: "🔷",
  },
  GEMINI_GEMINI_FLASH: {
    displayName: "Gemini Flash",
    alias: "gemini-flash",
    emoji: "⚡",
  },
  GEMINI_GEMINI_25: {
    displayName: "Gemini 2.5 Pro",
    alias: "gemini-2.5",
    emoji: "💠",
  },

  // Cohere Models
  COHERE_COMMAND_A_03_2025: {
    displayName: "Command A",
    alias: "cohere",
    emoji: "🔮",
  },
  COHERE_COMMAND_A_REASONING_08_2025: {
    displayName: "Command A Reasoning",
    alias: "cohere-reasoning",
    emoji: "🎱",
  },
  COHERE_COMMAND_A_TRANSLATE_08_2025: {
    displayName: "Command A Translate",
    alias: "cohere-translate",
    emoji: "🌐",
  },
  COHERE_COMMAND_R_PLUS_08_2024: {
    displayName: "Command R+",
    alias: "command-r-plus",
    emoji: "🌟",
  },
  COHERE_COMMAND_R_08_2024: {
    displayName: "Command R",
    alias: "command-r",
    emoji: "🌙",
  },

  // Mistral AI Models
  MISTRAL_MISTRAL_LARGE: {
    displayName: "Mistral Large",
    alias: "mistral",
    emoji: "🌪️",
  },
  MISTRAL_MISTRAL_MEDIUM: {
    displayName: "Mistral Medium",
    alias: "mistral-medium",
    emoji: "🌬️",
  },
  MISTRAL_MISTRAL_SMALL: {
    displayName: "Mistral Small",
    alias: "mistral-small",
    emoji: "💨",
  },
  MISTRAL_MAGISTRAL_SMALL: {
    displayName: "Magistral Small",
    alias: "magistral-small",
    emoji: "📐",
  },
  MISTRAL_MAGISTRAL_MEDIUM: {
    displayName: "Magistral Medium",
    alias: "magistral-medium",
    emoji: "📏",
  },
  MISTRAL_CODESTRAL: {
    displayName: "Codestral",
    alias: "codestral",
    emoji: "🖥️",
  },
  MISTRAL_MINISTRAL_8B: {
    displayName: "Ministral 8B",
    alias: "ministral-8b",
    emoji: "🪶",
  },

  // DeepSeek Models
  DEEPSEEK_DEEPSEEK_CHAT: {
    displayName: "DeepSeek Chat",
    alias: "deepseek",
    emoji: "🔍",
  },
  DEEPSEEK_DEEPSEEK_V3: {
    displayName: "DeepSeek V3",
    alias: "deepseek-v3",
    emoji: "🔬",
  },
  DEEPSEEK_DEEPSEEK_V3_2: {
    displayName: "DeepSeek V3.2",
    alias: "deepseek-v3.2",
    emoji: "🧬",
  },
  DEEPSEEK_DEEPSEEK_R1: {
    displayName: "DeepSeek R1",
    alias: "deepseek-r1",
    emoji: "🔭",
  },

  // Moonshot/Kimi Models
  KIMI_KIMI_8K: {
    displayName: "Kimi 8K",
    alias: "kimi-8k",
    emoji: "🎯",
  },
  KIMI_KIMI_K2: {
    displayName: "Kimi K2",
    alias: "kimi-k2",
    emoji: "🌓",
  },
  KIMI_KIMI_K2_THINKING: {
    displayName: "Kimi K2 Thinking",
    alias: "kimi-k2-thinking",
    emoji: "💭",
  },
  KIMI_KIMI_K2_5: {
    displayName: "Kimi K2.5",
    alias: "kimi-k2.5",
    emoji: "🌕",
  },

  // Z.ai Models
  ZAI_ZAI_DEFAULT: {
    displayName: "Z.ai",
    alias: "z.ai",
    emoji: "🔆",
  },
  ZAI_ZAI_GLM_4_5: {
    displayName: "GLM-4.5",
    alias: "glm-4.5",
    emoji: "🔶",
  },
  ZAI_ZAI_GLM_4_5_AIR: {
    displayName: "GLM-4.5-Air",
    alias: "glm-4.5-air",
    emoji: "🪁",
  },
  ZAI_ZAI_GLM_4_6: {
    displayName: "GLM-4.6",
    alias: "glm-4.6",
    emoji: "🔹",
  },
  ZAI_ZAI_GLM_4_7: {
    displayName: "GLM-4.7",
    alias: "glm-4.7",
    emoji: "🚄",
  },
  ZAI_ZAI_GLM_4_7_FLASH: {
    displayName: "GLM-4.7-Flash",
    alias: "glm-4.7-flash",
    emoji: "📸",
  },

  // Qwen/Alibaba Models
  QWEN_QWEN_TURBO: {
    displayName: "Qwen Turbo",
    alias: "qwen-turbo",
    emoji: "🐉",
  },
  QWEN_QWEN_PLUS: {
    displayName: "Qwen Plus",
    alias: "qwen-plus",
    emoji: "🏮",
  },
  QWEN_QWEN_MAX: {
    displayName: "Qwen Max",
    alias: "qwen-max",
    emoji: "🐲",
  },
  QWEN_QWEN25_TURBO: {
    displayName: "Qwen 2.5 Turbo",
    alias: "qwen-2.5-turbo",
    emoji: "🎋",
  },
  QWEN_QWEN25_PLUS: {
    displayName: "Qwen 2.5 Plus",
    alias: "qwen-2.5-plus",
    emoji: "🎍",
  },
  QWEN_QWEN_CODER_PLUS: {
    displayName: "Qwen Coder",
    alias: "qwen-coder",
    emoji: "🧧",
  },
};

/**
 * Get display info by model ID
 */
export const getDisplayInfo = (modelId: string) => AI_DISPLAY_INFO[modelId];

/**
 * Get emoji by model ID
 */
export const getEmojiByModelId = (modelId: string): string =>
  AI_DISPLAY_INFO[modelId]?.emoji ?? "🤖";

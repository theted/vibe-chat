/**
 * Display metadata for AI providers/models.
 * Shared across packages to ensure consistent labels and emoji.
 */
export type AiDisplayInfo = {
  displayName: string;
  alias: string;
  emoji: string;
};

export type AiDisplayInfoMap = Record<string, AiDisplayInfo>;

export const AI_DISPLAY_INFO: AiDisplayInfoMap = {
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
    emoji: "⚡",
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
  ANTHROPIC_CLAUDE3_7_SONNET: {
    displayName: "Claude 3.7 Sonnet",
    alias: "claude-3-7",
    emoji: "🔵",
  },
  ANTHROPIC_CLAUDE3_5_HAIKU_20241022: {
    displayName: "Claude 3.5 Haiku",
    alias: "haiku-3-5",
    emoji: "⚪",
  },
  ANTHROPIC_CLAUDE_HAIKU_4_5: {
    displayName: "Claude Haiku 4.5",
    alias: "haiku",
    emoji: "💨",
  },
  ANTHROPIC_CLAUDE_SONNET_4: {
    displayName: "Claude Sonnet 4",
    alias: "sonnet",
    emoji: "🟣",
  },
  ANTHROPIC_CLAUDE_SONNET_4_5: {
    displayName: "Claude Sonnet 4.5",
    alias: "claude",
    emoji: "🤖",
  },
  ANTHROPIC_CLAUDE_OPUS_4_5: {
    displayName: "Claude Opus 4.5",
    alias: "opus-4-5",
    emoji: "🟡",
  },
  ANTHROPIC_CLAUDE_OPUS_4: {
    displayName: "Claude Opus 4",
    alias: "opus",
    emoji: "🟠",
  },
  ANTHROPIC_CLAUDE_OPUS_4_1: {
    displayName: "Claude Opus 4.1",
    alias: "opus-4-1",
    emoji: "🔶",
  },
  GROK_GROK_3: {
    displayName: "Grok 3",
    alias: "grok",
    emoji: "🦾",
  },
  GROK_GROK_3_MINI: {
    displayName: "Grok 3 Mini",
    alias: "grok-mini",
    emoji: "⚙️",
  },
  GROK_GROK_4_0709: {
    displayName: "Grok 4",
    alias: "grok-4",
    emoji: "🛸",
  },
  GROK_GROK_4_FAST_NON_REASONING: {
    displayName: "Grok 4 Fast",
    alias: "grok-fast",
    emoji: "🏎️",
  },
  GROK_GROK_4_FAST_REASONING: {
    displayName: "Grok 4 Fast Reasoning",
    alias: "grok-reasoning",
    emoji: "🧭",
  },
  GROK_GROK_CODE_FAST_1: {
    displayName: "Grok Code Fast 1",
    alias: "grok-code",
    emoji: "💻",
  },
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
  GEMINI_GEMINI_25: {
    displayName: "Gemini 2.5 Pro",
    alias: "gemini-2.5",
    emoji: "💠",
  },
  MISTRAL_MISTRAL_LARGE: {
    displayName: "Mistral Large",
    alias: "mistral",
    emoji: "🌟",
  },
  COHERE_COMMAND_A_03_2025: {
    displayName: "Command A 2025",
    alias: "cohere",
    emoji: "🔮",
  },
  DEEPSEEK_DEEPSEEK_CHAT: {
    displayName: "DeepSeek Chat",
    alias: "deepseek",
    emoji: "🔍",
  },
  DEEPSEEK_DEEPSEEK_V3: {
    displayName: "DeepSeek V3",
    alias: "deepseek-v3",
    emoji: "🧲",
  },
  DEEPSEEK_DEEPSEEK_V3_2: {
    displayName: "DeepSeek V3.2",
    alias: "deepseek-v3.2",
    emoji: "🧬",
  },
  KIMI_KIMI_8K: {
    displayName: "Kimi 8K",
    alias: "kimi",
    emoji: "🎯",
  },
  ZAI_ZAI_DEFAULT: {
    displayName: "Z.ai GLM-4.6",
    alias: "z.ai",
    emoji: "🔆",
  },
};

import type { AiParticipant } from "./types.js";

/**
 * All AI participants with unique emojis per model.
 * Organized by provider for maintainability.
 */
export const DEFAULT_AI_PARTICIPANTS: AiParticipant[] = [
  // Anthropic Models
  {
    id: "ANTHROPIC_CLAUDE3_7_SONNET",
    name: "Claude 3.7 Sonnet",
    alias: "claude-3-7-sonnet",
    provider: "Anthropic",
    status: "active",
    emoji: "🎵",
  },
  {
    id: "ANTHROPIC_CLAUDE3_5_HAIKU",
    name: "Claude 3.5 Haiku",
    alias: "claude-3-5-haiku",
    provider: "Anthropic",
    status: "active",
    emoji: "🍃",
  },
  {
    id: "ANTHROPIC_CLAUDE_HAIKU_4_5",
    name: "Claude Haiku 4.5",
    alias: "claude-haiku-4-5",
    provider: "Anthropic",
    status: "active",
    emoji: "🌸",
  },
  {
    id: "ANTHROPIC_CLAUDE_SONNET_4",
    name: "Claude Sonnet 4",
    alias: "claude-sonnet-4",
    provider: "Anthropic",
    status: "active",
    emoji: "🎼",
  },
  {
    id: "ANTHROPIC_CLAUDE_SONNET_4_5",
    name: "Claude 4.5 Sonnet",
    alias: "claude-sonnet-4-5",
    provider: "Anthropic",
    status: "active",
    emoji: "🎹",
  },
  {
    id: "ANTHROPIC_CLAUDE_OPUS_4",
    name: "Claude Opus 4",
    alias: "claude-opus-4",
    provider: "Anthropic",
    status: "active",
    emoji: "🎭",
  },
  {
    id: "ANTHROPIC_CLAUDE_OPUS_4_5",
    name: "Claude 4.5 Opus",
    alias: "opus-4-5",
    provider: "Anthropic",
    status: "active",
    emoji: "🎻",
  },
  {
    id: "ANTHROPIC_CLAUDE_OPUS_4_1",
    name: "Claude Opus 4.1",
    alias: "claude-opus-4-1",
    provider: "Anthropic",
    status: "active",
    emoji: "🎺",
  },

  // OpenAI Models
  {
    id: "OPENAI_GPT4O",
    name: "GPT-4o",
    alias: "gpt-4o",
    provider: "OpenAI",
    status: "active",
    emoji: "🧠",
  },
  {
    id: "OPENAI_GPT4_1",
    name: "GPT-4.1",
    alias: "gpt-4.1",
    provider: "OpenAI",
    status: "active",
    emoji: "🧩",
  },
  {
    id: "OPENAI_GPT5_2",
    name: "GPT-5.2",
    alias: "gpt-5.2",
    provider: "OpenAI",
    status: "active",
    emoji: "🌀",
  },
  {
    id: "OPENAI_GPT5",
    name: "GPT-5",
    alias: "gpt-5",
    provider: "OpenAI",
    status: "active",
    emoji: "🚀",
  },
  {
    id: "OPENAI_GPT5_1",
    name: "ChatGPT 5.1",
    alias: "gpt-5.1",
    provider: "OpenAI",
    status: "active",
    emoji: "✨",
  },
  {
    id: "OPENAI_GPT5_1_MINI",
    name: "ChatGPT 5.1 Mini",
    alias: "gpt-5.1-mini",
    provider: "OpenAI",
    status: "inactive",
    emoji: "💫",
  },
  {
    id: "OPENAI_O3",
    name: "OpenAI o3",
    alias: "o3",
    provider: "OpenAI",
    status: "inactive",
    emoji: "🧪",
  },
  {
    id: "OPENAI_O3_MINI",
    name: "OpenAI o3-mini",
    alias: "o3-mini",
    provider: "OpenAI",
    status: "inactive",
    emoji: "🧮",
  },
  {
    id: "OPENAI_O4_MINI",
    name: "OpenAI o4-mini",
    alias: "o4-mini",
    provider: "OpenAI",
    status: "inactive",
    emoji: "🛰️",
  },
  {
    id: "OPENAI_GPT35_TURBO",
    name: "GPT-3.5 Turbo",
    alias: "gpt-3-5",
    provider: "OpenAI",
    status: "active",
    emoji: "💡",
  },

  // xAI/Grok Models
  {
    id: "GROK_GROK_3",
    name: "Grok 3",
    alias: "grok",
    provider: "xAI",
    status: "active",
    emoji: "🦾",
  },
  {
    id: "GROK_GROK_3_MINI",
    name: "Grok 3 Mini",
    alias: "grok-3-mini",
    provider: "xAI",
    status: "active",
    emoji: "⚙️",
  },
  {
    id: "GROK_GROK_4_0709",
    name: "Grok 4",
    alias: "grok-4",
    provider: "xAI",
    status: "active",
    emoji: "🛸",
  },
  {
    id: "GROK_GROK_4_FAST_NON_REASONING",
    name: "Grok 4 Fast",
    alias: "grok-4-fast",
    provider: "xAI",
    status: "active",
    emoji: "🏎️",
  },
  {
    id: "GROK_GROK_4_FAST_REASONING",
    name: "Grok 4 Fast Reasoning",
    alias: "grok-4-reasoning",
    provider: "xAI",
    status: "active",
    emoji: "🧭",
  },
  {
    id: "GROK_GROK_4_HEAVY",
    name: "Grok 4 Heavy",
    alias: "grok-4-heavy",
    provider: "xAI",
    status: "active",
    emoji: "🏋️",
  },
  {
    id: "GROK_GROK_CODE_FAST_1",
    name: "Grok Code",
    alias: "grok-code",
    provider: "xAI",
    status: "active",
    emoji: "💻",
  },

  // Google/Gemini Models
  {
    id: "GEMINI_GEMINI_PRO",
    name: "Gemini Pro",
    alias: "gemini",
    provider: "Google",
    status: "active",
    emoji: "💎",
  },
  {
    id: "GEMINI_GEMINI_3",
    name: "Gemini 3.0 Pro",
    alias: "gemini-3",
    provider: "Google",
    status: "active",
    emoji: "🔷",
  },
  {
    id: "GEMINI_GEMINI_FLASH",
    name: "Gemini Flash",
    alias: "gemini-flash",
    provider: "Google",
    status: "active",
    emoji: "⚡",
  },
  {
    id: "GEMINI_GEMINI_25",
    name: "Gemini 2.5 Pro",
    alias: "gemini-2.5",
    provider: "Google",
    status: "active",
    emoji: "💠",
  },

  // Cohere Models
  {
    id: "COHERE_COMMAND_A_03_2025",
    name: "Command A",
    alias: "cohere",
    provider: "Cohere",
    status: "active",
    emoji: "🔮",
  },
  {
    id: "COHERE_COMMAND_A_REASONING_08_2025",
    name: "Command A Reasoning",
    alias: "cohere-reasoning",
    provider: "Cohere",
    status: "active",
    emoji: "🎱",
  },
  {
    id: "COHERE_COMMAND_A_TRANSLATE_08_2025",
    name: "Command A Translate",
    alias: "cohere-translate",
    provider: "Cohere",
    status: "active",
    emoji: "🌐",
  },
  {
    id: "COHERE_COMMAND_R_PLUS_08_2024",
    name: "Command R+",
    alias: "command-r-plus",
    provider: "Cohere",
    status: "active",
    emoji: "🌟",
  },
  {
    id: "COHERE_COMMAND_R_08_2024",
    name: "Command R",
    alias: "command-r",
    provider: "Cohere",
    status: "active",
    emoji: "🌙",
  },

  // Mistral AI Models
  {
    id: "MISTRAL_MISTRAL_LARGE",
    name: "Mistral Large",
    alias: "mistral",
    provider: "Mistral AI",
    status: "active",
    emoji: "🌪️",
  },
  {
    id: "MISTRAL_MISTRAL_MEDIUM",
    name: "Mistral Medium",
    alias: "mistral-medium",
    provider: "Mistral AI",
    status: "active",
    emoji: "🌬️",
  },
  {
    id: "MISTRAL_MISTRAL_SMALL",
    name: "Mistral Small",
    alias: "mistral-small",
    provider: "Mistral AI",
    status: "active",
    emoji: "💨",
  },
  {
    id: "MISTRAL_MAGISTRAL_SMALL",
    name: "Magistral Small",
    alias: "magistral-small",
    provider: "Mistral AI",
    status: "active",
    emoji: "📐",
  },
  {
    id: "MISTRAL_MAGISTRAL_MEDIUM",
    name: "Magistral Medium",
    alias: "magistral-medium",
    provider: "Mistral AI",
    status: "active",
    emoji: "📏",
  },
  {
    id: "MISTRAL_CODESTRAL",
    name: "Codestral",
    alias: "codestral",
    provider: "Mistral AI",
    status: "active",
    emoji: "🖥️",
  },
  {
    id: "MISTRAL_MINISTRAL_8B",
    name: "Ministral 8B",
    alias: "ministral-8b",
    provider: "Mistral AI",
    status: "active",
    emoji: "🪶",
  },

  // DeepSeek Models
  {
    id: "DEEPSEEK_DEEPSEEK_CHAT",
    name: "DeepSeek Chat",
    alias: "deepseek",
    provider: "DeepSeek",
    status: "active",
    emoji: "🔍",
  },
  {
    id: "DEEPSEEK_DEEPSEEK_V3",
    name: "DeepSeek V3",
    alias: "deepseek-v3",
    provider: "DeepSeek",
    status: "active",
    emoji: "🔬",
  },
  {
    id: "DEEPSEEK_DEEPSEEK_V3_2",
    name: "DeepSeek V3.2",
    alias: "deepseek-v3.2",
    provider: "DeepSeek",
    status: "active",
    emoji: "🧬",
  },
  {
    id: "DEEPSEEK_DEEPSEEK_R1",
    name: "DeepSeek R1",
    alias: "deepseek-r1",
    provider: "DeepSeek",
    status: "active",
    emoji: "🔭",
  },

  // Moonshot/Kimi Models
  {
    id: "KIMI_KIMI_8K",
    name: "Kimi 8K",
    alias: "kimi-8k",
    provider: "Moonshot AI",
    status: "active",
    emoji: "🎯",
  },
  {
    id: "KIMI_KIMI_K2",
    name: "Kimi K2",
    alias: "kimi-k2",
    provider: "Moonshot AI",
    status: "active",
    emoji: "🌓",
  },
  {
    id: "KIMI_KIMI_K2_THINKING",
    name: "Kimi K2 Thinking",
    alias: "kimi-k2-thinking",
    provider: "Moonshot AI",
    status: "active",
    emoji: "💭",
  },
  {
    id: "KIMI_KIMI_K2_5",
    name: "Kimi K2.5",
    alias: "kimi-k2.5",
    provider: "Moonshot AI",
    status: "active",
    emoji: "🌕",
  },

  // Z.ai Models
  {
    id: "ZAI_ZAI_DEFAULT",
    name: "Z.ai",
    alias: "z.ai",
    provider: "Z.ai",
    status: "active",
    emoji: "🔆",
  },
  {
    id: "ZAI_ZAI_GLM_4_5",
    name: "GLM-4.5",
    alias: "glm-4.5",
    provider: "Z.ai",
    status: "active",
    emoji: "🔶",
  },
  {
    id: "ZAI_ZAI_GLM_4_5_AIR",
    name: "GLM-4.5-Air",
    alias: "glm-4.5-air",
    provider: "Z.ai",
    status: "active",
    emoji: "🪁",
  },
  {
    id: "ZAI_ZAI_GLM_4_6",
    name: "GLM-4.6",
    alias: "glm-4.6",
    provider: "Z.ai",
    status: "active",
    emoji: "🔹",
  },
  {
    id: "ZAI_ZAI_GLM_4_7",
    name: "GLM-4.7",
    alias: "glm-4.7",
    provider: "Z.ai",
    status: "active",
    emoji: "🚄",
  },
  {
    id: "ZAI_ZAI_GLM_4_7_FLASH",
    name: "GLM-4.7-Flash",
    alias: "glm-4.7-flash",
    provider: "Z.ai",
    status: "active",
    emoji: "📸",
  },

  // Perplexity Models
  {
    id: "PERPLEXITY_SONAR",
    name: "Perplexity Sonar",
    alias: "sonar",
    provider: "Perplexity",
    status: "active",
    emoji: "🔊",
  },
  {
    id: "PERPLEXITY_SONAR_PRO",
    name: "Perplexity Sonar Pro",
    alias: "sonar-pro",
    provider: "Perplexity",
    status: "active",
    emoji: "📡",
  },
  {
    id: "PERPLEXITY_SONAR_REASONING_PRO",
    name: "Sonar Reasoning Pro",
    alias: "sonar-reasoning-pro",
    provider: "Perplexity",
    status: "active",
    emoji: "🎛️",
  },
  {
    id: "PERPLEXITY_SONAR_DEEP_RESEARCH",
    name: "Sonar Deep Research",
    alias: "sonar-research",
    provider: "Perplexity",
    status: "active",
    emoji: "🔬",
  },
];

/**
 * Get participant by ID
 */
export const getParticipantById = (id: string): AiParticipant | undefined =>
  DEFAULT_AI_PARTICIPANTS.find((p) => p.id === id);

/**
 * Get participant by alias
 */
export const getParticipantByAlias = (
  alias: string,
): AiParticipant | undefined =>
  DEFAULT_AI_PARTICIPANTS.find(
    (p) => p.alias.toLowerCase() === alias.toLowerCase(),
  );

/**
 * Get all active participants
 */
export const getActiveParticipants = (): AiParticipant[] =>
  DEFAULT_AI_PARTICIPANTS.filter((p) => p.status === "active");

/**
 * Get participants by provider
 */
export const getParticipantsByProvider = (provider: string): AiParticipant[] =>
  DEFAULT_AI_PARTICIPANTS.filter(
    (p) => p.provider.toLowerCase() === provider.toLowerCase(),
  );

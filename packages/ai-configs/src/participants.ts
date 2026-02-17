import type { AiParticipant } from "./types.js";

/**
 * All AI participants with unique emojis per model.
 * Organized by provider for maintainability.
 *
 * Emoji themes by provider:
 *   Anthropic    - Music/performing arts (model names are musical forms)
 *   OpenAI       - Space/cosmos
 *   xAI/Grok     - Gaming/arcade (playful brand personality)
 *   Google       - Gems/crystals ("Gemini" = precious)
 *   Cohere       - Naval/seafaring ("Command" naming)
 *   Mistral AI   - Wind/weather ("Mistral" is a cold wind)
 *   DeepSeek     - Deep ocean creatures
 *   Moonshot AI  - Moon phases
 *   Qwen         - East Asian culture
 *   Z.ai         - Tools/engineering
 *   Meta         - Mountain animals (llama habitat)
 *   Amazon       - Rainforest
 *   NVIDIA       - Green (brand color)
 *   Baidu        - Bears (logo mascot)
 *   ByteDance    - Seeds/plants ("Seed" product)
 *   Hugging Face - Warmth/hugs
 *   Perplexity   - Sonar/signal
 *   Nous Research - Greek/wisdom ("Nous" = mind)
 *   Microsoft AI - Magic/wizards
 */
export const DEFAULT_AI_PARTICIPANTS: AiParticipant[] = [
  // Anthropic Models - Music/performing arts
  {
    id: "ANTHROPIC_CLAUDE_OPUS_4_6",
    name: "Claude Opus 4.6",
    alias: "claude-opus-4-6",
    provider: "Anthropic",
    status: "active",
    emoji: "🎶",
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
    id: "ANTHROPIC_CLAUDE_HAIKU_4_5",
    name: "Claude Haiku 4.5",
    alias: "claude-haiku-4-5",
    provider: "Anthropic",
    status: "active",
    emoji: "🎵",
  },
  {
    id: "ANTHROPIC_CLAUDE_OPUS_4_5",
    name: "Claude 4.5 Opus",
    alias: "opus-4-5",
    provider: "Anthropic",
    status: "inactive",
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
  {
    id: "ANTHROPIC_CLAUDE_SONNET_4",
    name: "Claude Sonnet 4",
    alias: "claude-sonnet-4",
    provider: "Anthropic",
    status: "inactive",
    emoji: "🎼",
  },
  {
    id: "ANTHROPIC_CLAUDE_OPUS_4",
    name: "Claude Opus 4",
    alias: "claude-opus-4",
    provider: "Anthropic",
    status: "inactive",
    emoji: "🎭",
  },
  {
    id: "ANTHROPIC_CLAUDE3_7_SONNET",
    name: "Claude 3.7 Sonnet",
    alias: "claude-3-7-sonnet",
    provider: "Anthropic",
    status: "inactive",
    emoji: "🎧",
  },
  {
    id: "ANTHROPIC_CLAUDE3_5_HAIKU_20241022",
    name: "Claude 3.5 Haiku",
    alias: "haiku-3-5",
    provider: "Anthropic",
    status: "inactive",
    emoji: "🪕",
  },

  // OpenAI Models - Space/cosmos
  {
    id: "OPENAI_GPT5_2",
    name: "GPT-5.2",
    alias: "gpt-5.2",
    provider: "OpenAI",
    status: "active",
    emoji: "🌀",
  },
  {
    id: "OPENAI_GPT5_2_PRO",
    name: "GPT-5.2 Pro",
    alias: "gpt-5.2-pro",
    provider: "OpenAI",
    status: "active",
    emoji: "🪐",
  },
  {
    id: "OPENAI_GPT5_MINI",
    name: "GPT-5 Mini",
    alias: "gpt-5-mini",
    provider: "OpenAI",
    status: "active",
    emoji: "💫",
  },
  {
    id: "OPENAI_GPT5_NANO",
    name: "GPT-5 Nano",
    alias: "gpt-5-nano",
    provider: "OpenAI",
    status: "active",
    emoji: "✳️",
  },
  {
    id: "OPENAI_GPT5",
    name: "GPT-5",
    alias: "gpt-5",
    provider: "OpenAI",
    status: "inactive",
    emoji: "🚀",
  },
  {
    id: "OPENAI_GPT5_1",
    name: "GPT-5.1",
    alias: "gpt-5.1",
    provider: "OpenAI",
    status: "inactive",
    emoji: "☄️",
  },
  {
    id: "OPENAI_GPT4O",
    name: "GPT-4o",
    alias: "gpt-4o",
    provider: "OpenAI",
    status: "active",
    emoji: "🌍",
  },
  {
    id: "OPENAI_GPT4O_MINI",
    name: "GPT-4o mini",
    alias: "gpt-4o-mini",
    provider: "OpenAI",
    status: "active",
    emoji: "🌏",
  },
  {
    id: "OPENAI_GPT4_1",
    name: "GPT-4.1",
    alias: "gpt-4.1",
    provider: "OpenAI",
    status: "active",
    emoji: "🛸",
  },
  {
    id: "OPENAI_GPT4_1_MINI",
    name: "GPT-4.1 mini",
    alias: "gpt-4.1-mini",
    provider: "OpenAI",
    status: "active",
    emoji: "🛰️",
  },
  {
    id: "OPENAI_GPT4_1_NANO",
    name: "GPT-4.1 nano",
    alias: "gpt-4.1-nano",
    provider: "OpenAI",
    status: "active",
    emoji: "🌌",
  },
  {
    id: "OPENAI_O3",
    name: "OpenAI o3",
    alias: "o3",
    provider: "OpenAI",
    status: "active",
    emoji: "🔭",
  },
  {
    id: "OPENAI_O3_PRO",
    name: "OpenAI o3-pro",
    alias: "o3-pro",
    provider: "OpenAI",
    status: "active",
    emoji: "🔮",
  },
  {
    id: "OPENAI_O4_MINI",
    name: "OpenAI o4-mini",
    alias: "o4-mini",
    provider: "OpenAI",
    status: "active",
    emoji: "🌠",
  },
  {
    id: "OPENAI_GPT35_TURBO",
    name: "GPT-3.5 Turbo",
    alias: "gpt-3-5",
    provider: "OpenAI",
    status: "inactive",
    emoji: "⭐",
  },

  // xAI/Grok Models - Gaming/arcade
  {
    id: "GROK_GROK_4_0709",
    name: "Grok 4",
    alias: "grok-4",
    provider: "xAI",
    status: "active",
    emoji: "👾",
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
    emoji: "🎮",
  },
  {
    id: "GROK_GROK_4_HEAVY",
    name: "Grok 4 Heavy",
    alias: "grok-4-heavy",
    provider: "xAI",
    status: "active",
    emoji: "🕹️",
  },
  {
    id: "GROK_GROK_4_1_FAST_NON_REASONING",
    name: "Grok 4.1 Fast",
    alias: "grok-4.1-fast",
    provider: "xAI",
    status: "active",
    emoji: "🎰",
  },
  {
    id: "GROK_GROK_4_1_FAST_REASONING",
    name: "Grok 4.1 Fast Reasoning",
    alias: "grok-4.1-reasoning",
    provider: "xAI",
    status: "active",
    emoji: "🎲",
  },
  {
    id: "GROK_GROK_3",
    name: "Grok 3",
    alias: "grok",
    provider: "xAI",
    status: "active",
    emoji: "🃏",
  },
  {
    id: "GROK_GROK_3_MINI",
    name: "Grok 3 Mini",
    alias: "grok-3-mini",
    provider: "xAI",
    status: "active",
    emoji: "🎯",
  },
  {
    id: "GROK_GROK_CODE_FAST_1",
    name: "Grok Code",
    alias: "grok-code",
    provider: "xAI",
    status: "active",
    emoji: "💾",
  },

  // Google/Gemini Models - Gems/crystals
  {
    id: "GEMINI_GEMINI_3_PRO",
    name: "Gemini 3 Pro",
    alias: "gemini-3-pro",
    provider: "Google",
    status: "active",
    emoji: "🔷",
  },
  {
    id: "GEMINI_GEMINI_3_FLASH",
    name: "Gemini 3 Flash",
    alias: "gemini-3-flash",
    provider: "Google",
    status: "active",
    emoji: "💠",
  },
  {
    id: "GEMINI_GEMINI_2_5_PRO",
    name: "Gemini 2.5 Pro",
    alias: "gemini-2.5-pro",
    provider: "Google",
    status: "active",
    emoji: "💎",
  },
  {
    id: "GEMINI_GEMINI_2_5_FLASH",
    name: "Gemini 2.5 Flash",
    alias: "gemini-2.5-flash",
    provider: "Google",
    status: "active",
    emoji: "🔹",
  },
  {
    id: "GEMINI_GEMINI_2_5_FLASH_LITE",
    name: "Gemini 2.5 Flash Lite",
    alias: "gemini-2.5-lite",
    provider: "Google",
    status: "active",
    emoji: "✨",
  },

  // Cohere Models - Naval/seafaring
  {
    id: "COHERE_COMMAND_A_03_2025",
    name: "Command A",
    alias: "cohere",
    provider: "Cohere",
    status: "active",
    emoji: "⚓",
  },
  {
    id: "COHERE_COMMAND_A_REASONING_08_2025",
    name: "Command A Reasoning",
    alias: "cohere-reasoning",
    provider: "Cohere",
    status: "active",
    emoji: "🧭",
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
    id: "COHERE_COMMAND_A_VISION_07_2025",
    name: "Command A Vision",
    alias: "cohere-vision",
    provider: "Cohere",
    status: "active",
    emoji: "🔱",
  },
  {
    id: "COHERE_COMMAND_R7B_12_2024",
    name: "Command R7B",
    alias: "command-r7b",
    provider: "Cohere",
    status: "active",
    emoji: "⛵",
  },
  {
    id: "COHERE_COMMAND_R_PLUS_08_2024",
    name: "Command R+",
    alias: "command-r-plus",
    provider: "Cohere",
    status: "active",
    emoji: "🚢",
  },
  {
    id: "COHERE_COMMAND_R_08_2024",
    name: "Command R",
    alias: "command-r",
    provider: "Cohere",
    status: "active",
    emoji: "🗺️",
  },

  // Mistral AI Models - Wind/weather
  {
    id: "MISTRAL_MISTRAL_LARGE",
    name: "Mistral Large 3",
    alias: "mistral",
    provider: "Mistral AI",
    status: "active",
    emoji: "🌪️",
  },
  {
    id: "MISTRAL_MISTRAL_MEDIUM",
    name: "Mistral Medium 3.1",
    alias: "mistral-medium",
    provider: "Mistral AI",
    status: "active",
    emoji: "🌬️",
  },
  {
    id: "MISTRAL_MISTRAL_SMALL",
    name: "Mistral Small 3.2",
    alias: "mistral-small",
    provider: "Mistral AI",
    status: "active",
    emoji: "💨",
  },
  {
    id: "MISTRAL_MAGISTRAL_MEDIUM",
    name: "Magistral Medium 1.2",
    alias: "magistral-medium",
    provider: "Mistral AI",
    status: "active",
    emoji: "🌩️",
  },
  {
    id: "MISTRAL_MAGISTRAL_SMALL",
    name: "Magistral Small 1.2",
    alias: "magistral-small",
    provider: "Mistral AI",
    status: "active",
    emoji: "☁️",
  },
  {
    id: "MISTRAL_CODESTRAL",
    name: "Codestral",
    alias: "codestral",
    provider: "Mistral AI",
    status: "active",
    emoji: "🌊",
  },
  {
    id: "MISTRAL_DEVSTRAL",
    name: "Devstral 2",
    alias: "devstral",
    provider: "Mistral AI",
    status: "active",
    emoji: "🌧️",
  },
  {
    id: "MISTRAL_DEVSTRAL_SMALL",
    name: "Devstral Small 2",
    alias: "devstral-small",
    provider: "Mistral AI",
    status: "active",
    emoji: "🌫️",
  },
  {
    id: "MISTRAL_MINISTRAL_14B",
    name: "Ministral 3 14B",
    alias: "ministral-14b",
    provider: "Mistral AI",
    status: "active",
    emoji: "🌤️",
  },
  {
    id: "MISTRAL_MINISTRAL_8B",
    name: "Ministral 3 8B",
    alias: "ministral-8b",
    provider: "Mistral AI",
    status: "active",
    emoji: "🪶",
  },

  // DeepSeek Models - Deep ocean creatures
  {
    id: "DEEPSEEK_DEEPSEEK_CHAT",
    name: "DeepSeek Chat",
    alias: "deepseek",
    provider: "DeepSeek",
    status: "active",
    emoji: "🐙",
  },
  {
    id: "DEEPSEEK_DEEPSEEK_R1",
    name: "DeepSeek R1",
    alias: "deepseek-r1",
    provider: "DeepSeek",
    status: "active",
    emoji: "🦑",
  },

  // Moonshot/Kimi Models - Moon phases
  {
    id: "KIMI_KIMI_K2_5",
    name: "Kimi K2.5",
    alias: "kimi-k2.5",
    provider: "Moonshot AI",
    status: "active",
    emoji: "🌑",
  },
  {
    id: "KIMI_KIMI_LATEST",
    name: "Kimi Latest",
    alias: "kimi-latest",
    provider: "Moonshot AI",
    status: "active",
    emoji: "🌕",
  },
  {
    id: "KIMI_KIMI_THINKING_PREVIEW",
    name: "Kimi Thinking Preview",
    alias: "kimi-thinking-preview",
    provider: "Moonshot AI",
    status: "active",
    emoji: "🌘",
  },
  {
    id: "KIMI_KIMI_8K",
    name: "Moonshot v1 8K",
    alias: "moonshot-v1-8k",
    provider: "Moonshot AI",
    status: "inactive",
    emoji: "🌗",
  },
  {
    id: "KIMI_KIMI_32K",
    name: "Moonshot v1 32K",
    alias: "moonshot-v1-32k",
    provider: "Moonshot AI",
    status: "inactive",
    emoji: "🌖",
  },
  {
    id: "KIMI_KIMI_128K",
    name: "Moonshot v1 128K",
    alias: "moonshot-v1-128k",
    provider: "Moonshot AI",
    status: "inactive",
    emoji: "🌓",
  },

  // Qwen/Alibaba Models - East Asian culture
  {
    id: "QWEN_QWEN3_MAX",
    name: "Qwen3 Max",
    alias: "qwen3-max",
    provider: "Qwen",
    status: "active",
    emoji: "🐲",
  },
  {
    id: "QWEN_QWEN3_235B",
    name: "Qwen3-235B",
    alias: "qwen3-235b",
    provider: "Qwen",
    status: "active",
    emoji: "🏯",
  },
  {
    id: "QWEN_QWEN3_CODER_PLUS",
    name: "Qwen3 Coder Plus",
    alias: "qwen3-coder-plus",
    provider: "Qwen",
    status: "active",
    emoji: "🧧",
  },
  {
    id: "QWEN_QWEN3_CODER_FLASH",
    name: "Qwen3 Coder Flash",
    alias: "qwen3-coder-flash",
    provider: "Qwen",
    status: "active",
    emoji: "🎎",
  },
  {
    id: "QWEN_QWEN_MAX",
    name: "Qwen Max",
    alias: "qwen-max",
    provider: "Qwen",
    status: "inactive",
    emoji: "🐉",
  },
  {
    id: "QWEN_QWEN_PLUS",
    name: "Qwen Plus",
    alias: "qwen-plus",
    provider: "Qwen",
    status: "active",
    emoji: "🏮",
  },
  {
    id: "QWEN_QWEN_TURBO",
    name: "Qwen Turbo",
    alias: "qwen-turbo",
    provider: "Qwen",
    status: "active",
    emoji: "🎋",
  },
  {
    id: "QWEN_QWEN_FLASH",
    name: "Qwen Flash",
    alias: "qwen-flash",
    provider: "Qwen",
    status: "active",
    emoji: "🎍",
  },

  // Z.ai Models - Tools/engineering
  {
    id: "ZAI_ZAI_GLM_5",
    name: "GLM-5",
    alias: "glm-5",
    provider: "Z.ai",
    status: "active",
    emoji: "🏗️",
  },
  {
    id: "ZAI_ZAI_GLM_4_7",
    name: "GLM-4.7",
    alias: "glm-4.7",
    provider: "Z.ai",
    status: "active",
    emoji: "⚙️",
  },
  {
    id: "ZAI_ZAI_GLM_4_7_FLASH",
    name: "GLM-4.7-Flash",
    alias: "glm-4.7-flash",
    provider: "Z.ai",
    status: "active",
    emoji: "🔧",
  },
  {
    id: "ZAI_ZAI_GLM_4_7V",
    name: "GLM-4.7V",
    alias: "glm-4.7v",
    provider: "Z.ai",
    status: "active",
    emoji: "🛠️",
  },
  {
    id: "ZAI_ZAI_GLM_4_6",
    name: "GLM-4.6",
    alias: "glm-4.6",
    provider: "Z.ai",
    status: "active",
    emoji: "🔩",
  },
  {
    id: "ZAI_ZAI_GLM_4_6V",
    name: "GLM-4.6V",
    alias: "glm-4.6v",
    provider: "Z.ai",
    status: "active",
    emoji: "🪛",
  },
  {
    id: "ZAI_ZAI_GLM_4_5",
    name: "GLM-4.5",
    alias: "glm-4.5",
    provider: "Z.ai",
    status: "active",
    emoji: "🔨",
  },
  {
    id: "ZAI_ZAI_GLM_4_5_AIR",
    name: "GLM-4.5-Air",
    alias: "glm-4.5-air",
    provider: "Z.ai",
    status: "active",
    emoji: "🪚",
  },
  {
    id: "ZAI_ZAI_GLM_4_5_AIRX",
    name: "GLM-4.5-AirX",
    alias: "glm-4.5-airx",
    provider: "Z.ai",
    status: "active",
    emoji: "📐",
  },
  {
    id: "ZAI_ZAI_GLM_4_5_FLASH",
    name: "GLM-4.5-Flash",
    alias: "glm-4.5-flash",
    provider: "Z.ai",
    status: "active",
    emoji: "🧲",
  },
  {
    id: "ZAI_ZAI_GLM_4_5_LONG",
    name: "GLM-4.5-Long",
    alias: "glm-4.5-long",
    provider: "Z.ai",
    status: "active",
    emoji: "📏",
  },
  {
    id: "ZAI_ZAI_DEFAULT",
    name: "Z.ai",
    alias: "z.ai",
    provider: "Z.ai",
    status: "active",
    emoji: "🔆",
  },

  // Meta/Llama Models - Mountain animals
  {
    id: "LLAMA_LLAMA_3_3_70B_INSTRUCT",
    name: "Llama 3.3 70B Instruct",
    alias: "llama-3.3-70b",
    provider: "Meta",
    status: "active",
    emoji: "🦙",
  },
  {
    id: "LLAMA_LLAMA_3_3_70B_INSTRUCT_FREE",
    name: "Llama 3.3 70B Instruct (Free)",
    alias: "llama-3.3-70b-free",
    provider: "Meta",
    status: "active",
    emoji: "🦙",
  },
  {
    id: "LLAMA_LLAMA_4_MAVERICK",
    name: "Llama 4 Maverick",
    alias: "llama-4-maverick",
    provider: "Meta",
    status: "active",
    emoji: "🦬",
  },
  {
    id: "LLAMA_LLAMA_4_SCOUT",
    name: "Llama 4 Scout",
    alias: "llama-4-scout",
    provider: "Meta",
    status: "active",
    emoji: "🦌",
  },

  // Amazon Models - Rainforest
  {
    id: "AMAZON_NOVA_2_LITE_V1",
    name: "Nova 2 Lite",
    alias: "nova-2-lite",
    provider: "Amazon",
    status: "active",
    emoji: "🦜",
  },
  {
    id: "AMAZON_NOVA_PRO_V1",
    name: "Nova Pro",
    alias: "nova-pro",
    provider: "Amazon",
    status: "active",
    emoji: "🌿",
  },

  // NVIDIA Models - Green (brand color)
  {
    id: "NVIDIA_NEMOTRON_3_NANO_30B_A3B",
    name: "Nemotron 3 Nano 30B A3B",
    alias: "nemotron-3-nano-30b-a3b",
    provider: "NVIDIA",
    status: "active",
    emoji: "💚",
  },
  {
    id: "NVIDIA_NEMOTRON_3_NANO_30B_A3B_FREE",
    name: "Nemotron 3 Nano 30B A3B (Free)",
    alias: "nemotron-3-nano-30b-a3b-free",
    provider: "NVIDIA",
    status: "active",
    emoji: "💚",
  },
  {
    id: "NVIDIA_NEMOTRON_3_NANO_2_VL",
    name: "Nemotron 3 Nano 2 VL",
    alias: "nemotron-3-nano-2-vl",
    provider: "NVIDIA",
    status: "active",
    emoji: "🟢",
  },

  // Xiaomi Models
  {
    id: "XIAOMI_MIMO_V2_FLASH",
    name: "MiMo-V2-Flash",
    alias: "mimo-v2-flash",
    provider: "Xiaomi",
    status: "active",
    emoji: "📱",
  },

  // MiniMax Models - Charts/sizing (Mini + Max)
  {
    id: "MINIMAX_MINIMAX_M2_1",
    name: "MiniMax M2.1",
    alias: "minimax-m2.1",
    provider: "MiniMax",
    status: "active",
    emoji: "📊",
  },
  {
    id: "MINIMAX_MINIMAX_M2",
    name: "MiniMax M2",
    alias: "minimax-m2",
    provider: "MiniMax",
    status: "active",
    emoji: "📈",
  },
  {
    id: "MINIMAX_MINIMAX_M1",
    name: "MiniMax M1",
    alias: "minimax-m1",
    provider: "MiniMax",
    status: "active",
    emoji: "📉",
  },

  // Baidu Models - Bears (logo mascot)
  {
    id: "BAIDU_ERNIE_4_5_21B_A3B_THINKING",
    name: "ERNIE 4.5 21B A3B Thinking",
    alias: "ernie-4.5-21b-thinking",
    provider: "Baidu",
    status: "active",
    emoji: "🐻",
  },
  {
    id: "BAIDU_ERNIE_4_5_21B_A3B",
    name: "ERNIE 4.5 21B A3B",
    alias: "ernie-4.5-21b",
    provider: "Baidu",
    status: "active",
    emoji: "🐼",
  },
  {
    id: "BAIDU_ERNIE_4_5_300B_A47B",
    name: "ERNIE 4.5 300B A47B",
    alias: "ernie-4.5-300b",
    provider: "Baidu",
    status: "active",
    emoji: "🐾",
  },

  // ByteDance Models - Seeds/plants
  {
    id: "BYTEDANCE_SEED_1_6_FLASH",
    name: "Seed 1.6 Flash",
    alias: "seed-1.6-flash",
    provider: "ByteDance",
    status: "active",
    emoji: "🌱",
  },
  {
    id: "BYTEDANCE_SEED_1_6",
    name: "Seed 1.6",
    alias: "seed-1.6",
    provider: "ByteDance",
    status: "active",
    emoji: "🌾",
  },

  // Hugging Face Models - Warmth/hugs
  {
    id: "HUGGINGFACE_ZEPHYR_141B_A35B",
    name: "Zephyr 141B-A35B",
    alias: "zephyr-141b",
    provider: "Hugging Face",
    status: "active",
    emoji: "🤗",
  },
  {
    id: "HUGGINGFACE_ZEPHYR_7B_BETA",
    name: "Zephyr 7B Beta",
    alias: "zephyr-7b-beta",
    provider: "Hugging Face",
    status: "active",
    emoji: "🫂",
  },

  // Arcee AI Models - Trophies/awards
  {
    id: "ARCEE_TRINITY_LARGE_PREVIEW_FREE",
    name: "Trinity Large Preview (Free)",
    alias: "trinity-large-free",
    provider: "Arcee AI",
    status: "active",
    emoji: "👑",
  },
  {
    id: "ARCEE_TRINITY_MINI_FREE",
    name: "Trinity Mini (Free)",
    alias: "trinity-mini-free",
    provider: "Arcee AI",
    status: "active",
    emoji: "🏅",
  },
  {
    id: "ARCEE_CODER_LARGE",
    name: "Arcee Coder Large",
    alias: "arcee-coder",
    provider: "Arcee AI",
    status: "active",
    emoji: "🎖️",
  },
  {
    id: "ARCEE_MAESTRO_REASONING",
    name: "Arcee Maestro Reasoning",
    alias: "arcee-maestro",
    provider: "Arcee AI",
    status: "active",
    emoji: "🏆",
  },

  // StepFun Models - Footsteps/stairs
  {
    id: "STEPFUN_STEP_3_5_FLASH_FREE",
    name: "Step 3.5 Flash (Free)",
    alias: "step-3.5-flash-free",
    provider: "StepFun",
    status: "active",
    emoji: "👣",
  },
  {
    id: "STEPFUN_STEP_3",
    name: "Step 3",
    alias: "step-3",
    provider: "StepFun",
    status: "active",
    emoji: "🪜",
  },

  // Inflection AI Models - Hearts
  {
    id: "INFLECTION_INFLECTION_3_PI",
    name: "Inflection Pi",
    alias: "pi",
    provider: "Inflection AI",
    status: "active",
    emoji: "💙",
  },
  {
    id: "INFLECTION_INFLECTION_3_PRODUCTIVITY",
    name: "Inflection Productivity",
    alias: "inflection-productivity",
    provider: "Inflection AI",
    status: "active",
    emoji: "💜",
  },

  // 01.AI Models - Numbers/math
  {
    id: "ZEROONEAI_YI_1_5_34B",
    name: "Yi-1.5 34B",
    alias: "yi-1.5-34b",
    provider: "01.AI",
    status: "active",
    emoji: "🔢",
  },
  {
    id: "ZEROONEAI_YI_CODER_9B",
    name: "Yi Coder 9B",
    alias: "yi-coder-9b",
    provider: "01.AI",
    status: "active",
    emoji: "🧮",
  },
  {
    id: "ZEROONEAI_YI_34B",
    name: "Yi 34B",
    alias: "yi-34b",
    provider: "01.AI",
    status: "active",
    emoji: "📟",
  },

  // Databricks Models
  {
    id: "DATABRICKS_DBRX_132B_INSTRUCT",
    name: "DBRX 132B Instruct",
    alias: "dbrx",
    provider: "Databricks",
    status: "active",
    emoji: "🧱",
  },

  // Nous Research Models - Greek/wisdom
  {
    id: "NOUS_HERMES_4_405B_FREE",
    name: "Hermes 4 405B (Free)",
    alias: "hermes-4-405b-free",
    provider: "Nous Research",
    status: "active",
    emoji: "🦉",
  },
  {
    id: "NOUS_HERMES_4_70B",
    name: "Hermes 4 70B",
    alias: "hermes-4-70b",
    provider: "Nous Research",
    status: "active",
    emoji: "🏛️",
  },
  {
    id: "NOUS_DEEPHERMES_3_MISTRAL_24B",
    name: "DeepHermes 3 Mistral 24B",
    alias: "deephermes-3",
    provider: "Nous Research",
    status: "active",
    emoji: "🫒",
  },

  // Phind Models
  {
    id: "PHIND_CODELLAMA_34B_V2",
    name: "Phind CodeLlama 34B v2",
    alias: "phind-codellama",
    provider: "Phind",
    status: "active",
    emoji: "🔎",
  },

  // Microsoft AI Models - Magic/wizards
  {
    id: "MICROSOFT_WIZARDLM_2_8X22B",
    name: "WizardLM-2 8x22B",
    alias: "wizardlm-2-8x22b",
    provider: "Microsoft AI",
    status: "active",
    emoji: "🧙‍♂️",
  },
  {
    id: "MICROSOFT_WIZARDLM_2_7B",
    name: "WizardLM-2 7B",
    alias: "wizardlm-2-7b",
    provider: "Microsoft AI",
    status: "active",
    emoji: "🪄",
  },

  // Snowflake Models
  {
    id: "SNOWFLAKE_ARCTIC_INSTRUCT",
    name: "Arctic Instruct",
    alias: "arctic",
    provider: "Snowflake",
    status: "active",
    emoji: "❄️",
  },

  // Perplexity Models - Sonar/signal
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
    alias: "sonar-deep-research",
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

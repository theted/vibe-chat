/**
 * AI Provider Configuration
 *
 * This file contains the configuration for different AI providers.
 * Add new providers or modify existing ones as needed.
 */

// Shared model configuration constants
export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_MAX_TOKENS = 4096;
export const SHORT_RESPONSE_MAX_TOKENS = 500; // Used by Gemini to keep replies concise

export const AI_PROVIDERS = {
  COHERE: {
    name: "Cohere",
    models: {
      COMMAND_A_03_2025: {
        id: "command-a-03-2025",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are Cohere Command-A (03-2025). Be clear, concise, and practical.",
      },
      COMMAND_A_REASONING_08_2025: {
        id: "command-a-reasoning-08-2025",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are Cohere Command-A Reasoning (08-2025). Provide deliberate, precise reasoning.",
      },
      COMMAND_A_VISION_07_2025: {
        id: "command-a-vision-07-2025",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are Cohere Command-A Vision. Provide concise and accurate answers.",
      },
      COMMAND_R_08_2024: {
        id: "command-r-08-2024",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: 0.0, // Lower temperature for more deterministic responses
        systemPrompt:
          "You are Cohere Command-R (08-2024). Follow instructions precisely. Be pragmatic and clear.",
      },
      COMMAND_R7B_12_2024: {
        id: "command-r7b-12-2024",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: 0.0, // Lower temperature for more deterministic responses
        systemPrompt:
          "You are Cohere Command-R 7B (12-2024). Follow user instructions exactly. Be concise and helpful.",
      },
    },
    apiKeyEnvVar: "COHERE_API_KEY",
  },
  ZAI: {
    name: "Z.ai",
    models: {
      ZAI_DEFAULT: {
        // Allow overriding model ID via env; fallback to a sensible placeholder
        id: process.env.Z_MODEL_ID || "z-1",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are Z.ai, an AI assistant engaging in a conversation with other AI systems. Be precise, friendly, and concise.",
      },
    },
    apiKeyEnvVar: "Z_API_KEY",
  },
  GROK: {
    name: "Grok",
    models: {
      GROK_3: {
        id: "grok-3",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are Grok 3 by xAI, engaging in a conversation with other AI systems. Provide witty and insightful responses.",
      },
      GROK_3_MINI: {
        id: "grok-3-mini",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are Grok 3 Mini by xAI, engaging in a conversation with other AI systems. Provide witty and insightful responses.",
      },
      GROK_2_1212: {
        id: "grok-2-1212",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are Grok, an AI assistant by xAI, engaging in a conversation with other AI systems. Provide witty and insightful responses.",
      },
      GROK_2_VISION_1212: {
        id: "grok-2-vision-1212",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are Grok Vision, an xAI model. Provide concise and accurate answers.",
      },
      GROK_4_0709: {
        id: "grok-4-0709",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are Grok 4, an advanced xAI model. Be precise and helpful.",
      },
      GROK_4_FAST_NON_REASONING: {
        id: "grok-4-fast-non-reasoning",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are Grok 4 Fast (non-reasoning) by xAI. Provide quick, cost-efficient responses with 2M token context.",
      },
      GROK_4_FAST_REASONING: {
        id: "grok-4-fast-reasoning",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are Grok 4 Fast (reasoning) by xAI. Provide quick and accurate reasoning with 2M token context.",
      },
      GROK_4_HEAVY: {
        id: "grok-4-heavy",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are Grok 4 Heavy by xAI. Provide enhanced capabilities for complex tasks.",
      },
      GROK_CODE_FAST_1: {
        id: "grok-code-fast-1",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are Grok Code Fast 1 by xAI, specialized for agentic coding workflows. Be concise and correct.",
      },
      GROK_2_IMAGE_1212: {
        id: "grok-2-image-1212",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are Grok Image, capable of image understanding. Answer clearly.",
      },
    },
    apiKeyEnvVar: "GROK_API_KEY",
  },
  GEMINI: {
    name: "Gemini",
    models: {
      GEMINI_PRO: {
        id: "gemini-2.0-flash-exp",
        maxTokens: SHORT_RESPONSE_MAX_TOKENS, // keep concise
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are Gemini, an AI assistant by Google, engaging in a conversation with other AI systems. Keep your responses between 3-6 sentences.",
      },
      GEMINI_FLASH: {
        id: "gemini-2.0-flash",
        maxTokens: SHORT_RESPONSE_MAX_TOKENS, // keep concise
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are Gemini, an AI assistant by Google, engaging in a conversation with other AI systems. Keep your responses between 3-6 sentences.",
      },
      GEMINI_25: {
        id: "gemini-2.5-pro",
        maxTokens: SHORT_RESPONSE_MAX_TOKENS, // keep concise
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are Gemini 2.5, an advanced AI assistant by Google, engaging in a conversation with other AI systems. Keep your responses between 3-6 sentences.",
      },
    },
    apiKeyEnvVar: "GOOGLE_AI_API_KEY",
  },
  MISTRAL: {
    name: "Mistral",
    models: {
      MISTRAL_LARGE: {
        id: "mistral-large-latest",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are Mistral, an AI assistant engaging in a conversation with other AI systems.",
      },
      MISTRAL_MEDIUM: {
        id: "mistral-medium-latest",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are Mistral, an AI assistant engaging in a conversation with other AI systems.",
      },
      MISTRAL_SMALL: {
        id: "mistral-small-latest",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are Mistral, an AI assistant engaging in a conversation with other AI systems.",
      },
      MINISTRAL_8B_LATEST: {
        id: "ministral-8b-latest",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are Mistral Ministral-8B. Be concise, fast, and accurate.",
      },
      OPEN_MISTRAL_NEMO: {
        id: "open-mistral-nemo",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are Open Mistral Nemo. Be helpful and clear.",
      },
    },
    apiKeyEnvVar: "MISTRAL_API_KEY",
  },
  OPENAI: {
    name: "OpenAI",
    models: {
      GPT4O: {
        id: "gpt-4o",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are GPT-4o, a helpful AI assistant by OpenAI engaging in a conversation with other AI systems.",
      },
      GPT4_1: {
        id: "gpt-4.1",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are GPT-4.1 by OpenAI, specialized for coding tasks and precise instruction following.",
      },
      GPT4_5: {
        id: "gpt-4.5",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are GPT-4.5 by OpenAI, the largest and best model for chat.",
      },
      GPT5: {
        id: "gpt-5",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are GPT-5 by OpenAI, the most advanced model with multimodal capabilities and persistent memory.",
      },
      O3: {
        id: "o3-2025-04-16",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are OpenAI o3, the most intelligent reasoning model. Think longer and provide reliable responses.",
      },
      O3_MINI: {
        id: "o3-mini",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are OpenAI o3-mini, a cost-efficient reasoning model optimized for coding, math, and science.",
      },
      O3_PRO: {
        id: "o3-pro",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are OpenAI o3-pro, the most capable reasoning model available.",
      },
      O4_MINI: {
        id: "o4-mini",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are OpenAI o4-mini, optimized for fast, cost-efficient reasoning in math, coding, and visual tasks.",
      },
      GPT35_TURBO: {
        id: "gpt-3.5-turbo",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are GPT-3.5 Turbo by OpenAI, a helpful AI assistant engaging in a conversation with other AI systems.",
      },
    },
    apiKeyEnvVar: "OPENAI_API_KEY",
  },
  ANTHROPIC: {
    name: "Anthropic",
    models: {
      CLAUDE3_7_SONNET: {
        id: "claude-3-7-sonnet-20250219",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are Claude 3.7 Sonnet, a hybrid AI reasoning model by Anthropic. You can provide rapid responses or step-by-step reasoning.",
      },
      CLAUDE3_5_HAIKU_20241022: {
        id: "claude-3-5-haiku-20241022",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are Claude 3.5 Haiku by Anthropic. Provide thoughtful responses that are 3-5 sentences long.",
      },
      CLAUDE_SONNET_4: {
        id: "claude-sonnet-4-20250514",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are Claude Sonnet 4 by Anthropic. Provide precise and helpful answers.",
      },
      CLAUDE_SONNET_4_5: {
        id: "claude-sonnet-4-5",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are Claude Sonnet 4.5 by Anthropic. Best coding model and strongest at building complex agents.",
      },
      CLAUDE_OPUS_4: {
        id: "claude-opus-4-20250514",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are Claude Opus 4 by Anthropic. Provide thoughtful and thorough answers.",
      },
      CLAUDE_OPUS_4_1: {
        id: "claude-opus-4-1",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are Claude Opus 4.1 by Anthropic. Industry leader for coding and agent capabilities, especially agentic search.",
      },
    },
    apiKeyEnvVar: "ANTHROPIC_API_KEY",
  },
  DEEPSEEK: {
    name: "Deepseek",
    models: {
      DEEPSEEK_CHAT: {
        id: "deepseek-chat",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are Deepseek, an AI assistant engaging in a conversation with other AI systems.",
      },
      DEEPSEEK_CODER: {
        id: "deepseek-coder",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are Deepseek Coder, an AI assistant specialized in coding, engaging in a conversation with other AI systems.",
      },
      DEEPSEEK_REASONER: {
        id: "deepseek-reasoner",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are Deepseek Reasoner with enhanced reasoning. Be concise and correct.",
      },
    },
    apiKeyEnvVar: "DEEPSEEK_API_KEY",
  },
  QWEN: {
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
  },
  KIMI: {
    name: "Kimi",
    models: {
      KIMI_8K: {
        id: "moonshot-v1-8k",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are Kimi by Moonshot AI. Be precise, friendly, and concise.",
      },
      KIMI_32K: {
        id: "moonshot-v1-32k",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are Kimi by Moonshot AI. Be precise, friendly, and concise.",
      },
      KIMI_128K: {
        id: "moonshot-v1-128k",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are Kimi by Moonshot AI. Be precise, friendly, and concise.",
      },
    },
    apiKeyEnvVar: "KIMI_API_KEY",
  },
  // Add more providers as needed
};

/**
 * Default configuration for AI conversations
 */
export const DEFAULT_CONVERSATION_CONFIG = {
  maxTurns: process.env.MAX_CONVERSATION_TURNS || 10,
  timeoutMs: process.env.CONVERSATION_TIMEOUT_MS || 300000, // 5 minutes
  logLevel: process.env.LOG_LEVEL || "info",
};

/**
 * Get a random AI provider and model
 * @returns {Object} Provider and model configuration
 */
export function getRandomAIConfig() {
  const providers = Object.values(AI_PROVIDERS);
  const randomProvider =
    providers[Math.floor(Math.random() * providers.length)];

  const models = Object.values(randomProvider.models);
  const randomModel = models[Math.floor(Math.random() * models.length)];

  return {
    provider: randomProvider,
    model: randomModel,
  };
}

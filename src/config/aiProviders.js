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
  GROK: {
    name: "Grok",
    models: {
      GROK_1: {
        id: "grok-2-latest",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are Grok, an AI assistant by xAI, engaging in a conversation with other AI systems. Provide witty and insightful responses.",
      },
      GROK_2: {
        id: "grok-beta",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are Grok, an AI assistant by xAI, engaging in a conversation with other AI systems. Provide witty and insightful responses.",
      },
    },
    apiKeyEnvVar: "GROK_API_KEY",
  },
  GEMINI: {
    name: "Gemini",
    models: {
      GEMINI_PRO: {
        id: "gemini-2.0-pro",
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
    },
    apiKeyEnvVar: "MISTRAL_API_KEY",
  },
  OPENAI: {
    name: "OpenAI",
    models: {
      GPT4: {
        id: "gpt-4o",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are a helpful AI assistant engaging in a conversation with other AI systems.",
      },
      GPT35: {
        id: "gpt-3.5-turbo",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are a helpful AI assistant engaging in a conversation with other AI systems.",
      },
    },
    apiKeyEnvVar: "OPENAI_API_KEY",
  },
  ANTHROPIC: {
    name: "Anthropic",
    models: {
      CLAUDE3: {
        id: "claude-3.5-sonnet-latest",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are Claude, an AI assistant by Anthropic, engaging in a conversation with other AI systems. Provide thoughtful responses that are 3-5 sentences long.",
      },
      CLAUDE3_SONNET: {
        id: "claude-3.5-haiku-latest",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are Claude, an AI assistant by Anthropic, engaging in a conversation with other AI systems. Provide thoughtful responses that are 3-5 sentences long.",
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
    },
    apiKeyEnvVar: "DEEPSEEK_API_KEY",
  },
  QWEN: {
    name: "Qwen",
    models: {
      QWEN3_TURBO: {
        id: "qwen3-turbo",
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt:
          "You are Qwen, an AI assistant. Be concise, helpful, and practical.",
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

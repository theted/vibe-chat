/**
 * AI Provider Configuration
 *
 * This file contains the configuration for different AI providers.
 * Add new providers or modify existing ones as needed.
 */

export const AI_PROVIDERS = {
  OPENAI: {
    name: "OpenAI",
    models: {
      GPT4: {
        id: "gpt-4-turbo",
        maxTokens: 4096,
        temperature: 0.7,
        systemPrompt:
          "You are a helpful AI assistant engaging in a conversation with other AI systems.",
      },
      GPT35: {
        id: "gpt-3.5-turbo",
        maxTokens: 4096,
        temperature: 0.7,
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
        id: "claude-3-opus-20240229",
        maxTokens: 4096,
        temperature: 0.7,
        systemPrompt:
          "You are Claude, an AI assistant by Anthropic, engaging in a conversation with other AI systems.",
      },
      CLAUDE3_SONNET: {
        id: "claude-3-sonnet-20240229",
        maxTokens: 4096,
        temperature: 0.7,
        systemPrompt:
          "You are Claude, an AI assistant by Anthropic, engaging in a conversation with other AI systems.",
      },
    },
    apiKeyEnvVar: "ANTHROPIC_API_KEY",
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

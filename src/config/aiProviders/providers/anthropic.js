import { DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from "../constants.js";

export const ANTHROPIC = {
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
};
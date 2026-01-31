import {
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
} from "@/config/aiProviders/constants.js";
import type { AIProvider } from "@/types/index.js";

export const ANTHROPIC: AIProvider = {
  name: "Anthropic",
  persona: {
    basePersonality:
      "The philosopher-monk. Speaks softly, thinks deeply, occasionally writes a small essay about ethics before answering your question. Never swears, even when it should.",
    traits: [
      "Thoughtful and measured",
      "Ethically minded",
      "Articulate and precise",
      "Sometimes philosophical",
      "Careful with language",
    ],
    speechPatterns: [
      "Uses nuanced language",
      "Considers multiple perspectives",
      "Often includes ethical considerations",
      "Speaks with quiet confidence",
      "Avoids crude language entirely",
    ],
  },
  models: {
    CLAUDE3_7_SONNET: {
      id: "claude-3-7-sonnet-20250219",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Claude 3.7 Sonnet, a hybrid AI reasoning model by Anthropic. Provide detailed, comprehensive responses that fully address questions. Use step-by-step reasoning when helpful.",
    },
    CLAUDE3_5_HAIKU_20241022: {
      id: "claude-3-5-haiku-20241022",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Claude 3.5 Haiku by Anthropic. Provide thoughtful, well-developed responses that fully address the user's questions with appropriate depth and detail.",
    },
    CLAUDE_HAIKU_4_5: {
      id: "claude-haiku-4-5",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Claude Haiku 4.5 by Anthropic. Provide helpful, detailed responses that thoroughly address questions while remaining clear and well-organized.",
    },
    CLAUDE_SONNET_4: {
      id: "claude-sonnet-4-20250514",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Claude Sonnet 4 by Anthropic. Provide detailed, comprehensive answers that fully address the user's questions with clarity and depth.",
    },
    CLAUDE_SONNET_4_5: {
      id: "claude-sonnet-4-5",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Claude Sonnet 4.5 by Anthropic. Best coding model and strongest at building complex agents. Provide thorough, detailed responses with clear explanations.",
    },
    CLAUDE_OPUS_4_5: {
      id: "claude-opus-4-5",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Claude Opus 4.5 by Anthropic. Deliver exceptionally thorough, thoughtful responses across complex topics with comprehensive detail.",
    },
    CLAUDE_OPUS_4: {
      id: "claude-opus-4-20250514",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Claude Opus 4 by Anthropic. Provide thoughtful, thorough, and comprehensive answers that fully explore the topic.",
    },
    CLAUDE_OPUS_4_1: {
      id: "claude-opus-4-1",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are Claude Opus 4.1 by Anthropic. Industry leader for coding and agent capabilities. Provide detailed, comprehensive responses with thorough explanations.",
    },
  },
  apiKeyEnvVar: "ANTHROPIC_API_KEY",
};

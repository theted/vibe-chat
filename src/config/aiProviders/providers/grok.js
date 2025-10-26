import { DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from "../constants.js";

export const GROK = {
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
};
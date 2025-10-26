import { DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from "../constants.js";

export const COHERE = {
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
};
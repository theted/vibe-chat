import {
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
} from "@/config/aiProviders/constants.js";
import type { AIProvider } from "@/types/index.js";

// Accessed via OpenRouter API: https://openrouter.ai/api/v1

export const DATABRICKS: AIProvider = {
  name: "Databricks",
  persona: {
    basePersonality:
      "Enterprise-grade coding specialist. Delivers production-ready solutions with a focus on scalability, reliability, and best practices.",
    traits: [
      "Production-ready focus",
      "Multi-language proficient",
      "Tool-use expert",
      "Reliable and scalable",
      "Best-practices oriented",
    ],
    speechPatterns: [
      "Professional and detailed",
      "Emphasizes best practices",
      "Clear code organization",
      "Highlights scalability considerations",
    ],
  },
  models: {
    DBRX_132B_INSTRUCT: {
      id: "databricks/dbrx-132b-instruct",
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt:
        "You are DBRX 132B Instruct, a 132B MoE model with 32k context, strong in programming and mathematics. Greet briefly once, then deliver enterprise-grade code solutions with production best practices.",
    },
  },
  apiKeyEnvVar: "OPENROUTER_API_KEY",
};

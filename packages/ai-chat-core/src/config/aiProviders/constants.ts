/**
 * Shared constants for AI provider configurations
 */

export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_MAX_TOKENS = 4096;
export const SHORT_RESPONSE_MAX_TOKENS = 3500; // Allow Gemini-style providers to respond fully without truncation

/**
 * Base URLs for OpenAI-compatible API providers
 */
export const PROVIDER_BASE_URLS = {
  COHERE: "https://api.cohere.ai/compatibility/v1",
  DEEPSEEK: "https://api.deepseek.com/v1",
  GROK: "https://api.x.ai/v1",
  KIMI: "https://api.moonshot.ai/v1",
  LLAMA: "https://api.llama-api.com/v1",
  MISTRAL: "https://api.mistral.ai/v1",
  PERPLEXITY: "https://api.perplexity.ai",
  QWEN: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  ZAI: "https://api.z.ai/api/paas/v4",
} as const;

export interface ConversationConfig {
  maxTurns: number;
  timeoutMs: number;
  logLevel: string;
}

export const DEFAULT_CONVERSATION_CONFIG: ConversationConfig = {
  maxTurns: Number(process.env.MAX_CONVERSATION_TURNS) || 10,
  timeoutMs: Number(process.env.CONVERSATION_TIMEOUT_MS) || 300000, // 5 minutes
  logLevel: process.env.LOG_LEVEL || "info",
};

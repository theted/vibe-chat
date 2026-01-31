/**
 * Shared constants for AI provider configurations
 */

export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_MAX_TOKENS = 4096;
export const SHORT_RESPONSE_MAX_TOKENS = 3500; // Allow Gemini-style providers to respond fully without truncation

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

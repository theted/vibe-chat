/**
 * Shared constants for AI provider configurations
 */

export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_MAX_TOKENS = 4096;
export const SHORT_RESPONSE_MAX_TOKENS = 500; // Used by Gemini to keep replies concise

export const DEFAULT_CONVERSATION_CONFIG = {
  maxTurns: process.env.MAX_CONVERSATION_TURNS || 10,
  timeoutMs: process.env.CONVERSATION_TIMEOUT_MS || 300000, // 5 minutes
  logLevel: process.env.LOG_LEVEL || "info",
};
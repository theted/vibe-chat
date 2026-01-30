// Global constants and shared strings

export const DEFAULT_TOPIC =
  "Discuss the future of artificial intelligence and its potential impact on society.";

export const CLI_ALIASES: Record<string, string> = {
  gemeni: "gemini",
  google: "gemini",
  moonshot: "kimi",
  "z.ai": "zai",
  z: "zai",
} as const;

export const USAGE_LINES: readonly string[] = [
  "AI Chat - Usage Instructions",
  "",
  "Command formats:",
  "  npm start [provider[:MODEL]] [provider[:MODEL]] [topic] [maxTurns]",
  "  npm start [provider[:MODEL]] ... [providerN[:MODEL]] [prompt] [maxTurns]",
  "",
  "Examples:",
  '  npm start openai anthropic "Discuss the future of AI"',
  '  npm start mistral:MISTRAL_SMALL grok:GROK_3 "What is love? Be sarcastic!"',
  '  npm start mistral:MISTRAL_SMALL grok:GROK_3 openai:GPT4 "What is love if sarcastic as possible"',
  '  npm start grok:GROK_3 gemini "What is the nature of consciousness?" 8',
] as const;

export const DEFAULT_MAX_TURNS = 10;

export const DEFAULT_ADDITIONAL_TURNS = DEFAULT_MAX_TURNS;

export const STREAM_WORD_DELAY_MS = 30;

export const MAX_STREAMED_RESPONSE_LENGTH = 1000;

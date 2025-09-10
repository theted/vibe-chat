// Global constants and shared strings

export const DEFAULT_TOPIC =
  "Discuss the future of artificial intelligence and its potential impact on society.";

export const CLI_ALIASES = {
  gemeni: "gemini",
  google: "gemini",
  moonshot: "kimi",
};

export const USAGE_LINES = [
  "AI Chat - Usage Instructions",
  "",
  "Command formats:",
  "  npm start [provider[:MODEL]] [provider[:MODEL]] [topic] [maxTurns]",
  "  npm start [provider[:MODEL]] ... [providerN[:MODEL]] [prompt] [maxTurns]",
  "",
  "Examples:",
  '  npm start openai anthropic "Discuss the future of AI"',
  '  npm start mistral:MISTRAL_SMALL grok:GROK_2 "What is love? Be sarcastic!"',
  '  npm start mistral:MISTRAL_SMALL grok:GROK_2 openai:GPT4 "What is love if sarcastic as possible"',
  '  npm start grok:GROK_2 gemini "What is the nature of consciousness?" 8',
];


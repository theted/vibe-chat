export const DEFAULT_SERVER_URL = "http://localhost:3001";

export const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || DEFAULT_SERVER_URL;

export const DASHBOARD_HISTORY_DURATION_MS = 60 * 60 * 1000; // 1 hour

export const DASHBOARD_REFRESH_INTERVAL_MS = 30_000; // 30 seconds

export const DEFAULT_ROOM_ID = "default";

export const SOCKET_CONNECTION_OPTIONS = Object.freeze({
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
  timeout: 20_000,
});

export const AI_EMOJI_LOOKUP = {
  claude: "🤖",
  anthropic: "🤖",
  gpt: "🧠",
  gpt4: "🧠",
  gpt35: "🧠",
  openai: "🧠",
  grok: "🦾",
  xai: "🦾",
  gemini: "💎",
  google: "💎",
  bard: "💎",
  cohere: "🔮",
  command: "🔮",
  commandr: "🔮",
  mistral: "🌟",
  kimi: "🎯",
  moonshot: "🎯",
  zai: "⚡",
  z: "⚡",
  "z.ai": "⚡",
};

export const AI_MENTION_MAPPINGS = {
  claude: "claude",
  anthropic: "claude",
  gpt: "gpt-4",
  gpt4: "gpt-4",
  gpt35: "gpt-3.5-turbo",
  "gpt-4": "gpt-4",
  openai: "gpt-4",
  chatgpt: "gpt-4",
  grok: "grok",
  xai: "grok",
  gemini: "gemini",
  google: "gemini",
  bard: "gemini",
  command: "cohere",
  commandr: "cohere",
  cohere: "cohere",
  mistral: "mistral",
  kimi: "kimi",
  moonshot: "kimi",
  "z.ai": "z.ai",
  z: "z.ai",
  zai: "z.ai",
};

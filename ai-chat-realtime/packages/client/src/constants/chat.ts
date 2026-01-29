const resolveServerUrl = (): string => {
  const envUrl = (import.meta.env.VITE_SERVER_URL || "").trim();
  if (envUrl) {
    return envUrl;
  }

  if (typeof window !== "undefined" && window.location) {
    const { protocol, hostname, port } = window.location;
    if (port === "3000") {
      const targetPort = import.meta.env.VITE_SERVER_PORT || "3001";
      return `${protocol}//${hostname}:${targetPort}`;
    }
    const portSegment = port ? `:${port}` : "";
    return `${protocol}//${hostname}${portSegment}`;
  }

  return "http://localhost:3001";
};

export const SERVER_URL = resolveServerUrl();

export const AI_EMOJI_LOOKUP: Record<string, string> = {
  claude: "🤖",
  anthropic: "🤖",
  gpt: "🧠",
  gpt4: "🧠",
  gpt35: "🧠",
  openai: "🧠",
  grok: "🦾",
  xai: "🦾",
  gemini3: "🔷",
  gemini30: "🔷",
  gemini: "💎",
  google: "💎",
  bard: "💎",
  cohere: "🔮",
  command: "🔮",
  commandr: "🔮",
  "cohere-reasoning": "🧠",
  "cohere-translate": "🌐",
  "command-r-plus": "💫",
  "command-r": "✨",
  mistral: "🌟",
  kimi: "🎯",
  moonshot: "🎯",
  zai: "⚡",
  z: "⚡",
  "z.ai": "⚡",
};

export const AI_MENTION_MAPPINGS: Record<string, string> = {
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
  gemini3: "gemini",
  "gemini-3": "gemini",
  "gemini 3": "gemini",
  "gemini 3.0": "gemini",
  gemini: "gemini",
  google: "gemini",
  bard: "gemini",
  command: "cohere",
  commandr: "cohere",
  cohere: "cohere",
  "cohere-reasoning": "cohere-reasoning",
  "cohere-translate": "cohere-translate",
  "command-r-plus": "command-r-plus",
  "command-r": "command-r",
  mistral: "mistral",
  kimi: "kimi",
  moonshot: "kimi",
  "z.ai": "z.ai",
  z: "z.ai",
  zai: "z.ai",
};

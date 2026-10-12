// Every provider below serves an OpenAI-compatible /embeddings endpoint, so a
// single `openai` client with a different baseURL covers all of them
// ("compatible" has limits - see encoding_format in embeddings.ts).
// Anthropic has no embeddings endpoint of its own.

export type EmbeddingProviderConfig = {
  baseURL?: string;
  model: string;
  apiKeyEnv: string;
};

export const EMBEDDING_PROVIDERS = {
  // Code-specialised model; the index is mostly source code
  mistral: {
    baseURL: "https://api.mistral.ai/v1",
    model: "codestral-embed",
    apiKeyEnv: "MISTRAL_API_KEY",
  },
  openai: {
    model: "text-embedding-3-small",
    apiKeyEnv: "OPENAI_API_KEY",
  },
  gemini: {
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    model: "gemini-embedding-001",
    apiKeyEnv: "GOOGLE_AI_API_KEY",
  },
  cohere: {
    baseURL: "https://api.cohere.ai/compatibility/v1",
    model: "embed-v4.0",
    apiKeyEnv: "COHERE_API_KEY",
  },
} as const satisfies Record<string, EmbeddingProviderConfig>;

export type EmbeddingProviderName = keyof typeof EMBEDDING_PROVIDERS;

export const DEFAULT_EMBEDDING_PROVIDER: EmbeddingProviderName = "mistral";
export const EMBEDDING_PROVIDER_ENV = "CHAT_ASSISTANT_EMBEDDINGS";

export const DEFAULT_COLLECTION_NAME = "ai-chat-workspace";
export const DEFAULT_CHROMA_URL = "http://localhost:8000";

export const DEFAULT_ALLOWED_EXTENSIONS = new Set<string>([
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".jsx",
  ".json",
  ".md",
  ".yml",
  ".yaml",
  ".css",
  ".scss",
]);

export const DEFAULT_CHUNK_SIZE = 1800;
export const DEFAULT_CHUNK_OVERLAP = 300;
// Mistral caps tokens per embeddings request; 16 chunks of ~500 tokens stays
// well under it, and every provider here accepts that batch size.
export const DEFAULT_BATCH_SIZE = 16;

export const IGNORED_PATHS: string[] = [
  "**/node_modules/**",
  "**/.git/**",
  "**/.next/**",
  "**/dist/**",
  "**/build/**",
  "**/coverage/**",
  "**/.mcp-data/**",
  "**/.cache/**",
  "**/package-lock.json",
  "**/model-health.json",
];

export const VECTOR_STORE_UNAVAILABLE_CODE = "E_VECTOR_STORE_UNAVAILABLE";
export const EMBEDDING_STORE_MISSING_CODE = "E_EMBEDDING_STORE_MISSING";

// Collection metadata keys. The fingerprint lets startup tell a stale index
// (code changed since it was built) from a current one.
export const FINGERPRINT_METADATA_KEY = "fingerprint";
// Bump when indexing logic changes in a way that invalidates stored vectors
export const INDEX_FORMAT_VERSION = 2;
export const EMBEDDING_MODEL_METADATA_KEY = "embeddingModel";

export const SEARCH_DEFAULT_RESULTS = 6;
export const SEARCH_MAX_RESULTS = 12;

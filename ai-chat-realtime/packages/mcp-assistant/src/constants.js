export const DEFAULT_COLLECTION_NAME = "ai-chat-workspace";
export const DEFAULT_CHROMA_URL = "http://localhost:8000";
export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
export const DEFAULT_COMPLETION_MODEL = "gpt-4o-mini";

export const DEFAULT_ALLOWED_EXTENSIONS = new Set([
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
export const DEFAULT_BATCH_SIZE = 64;

export const IGNORED_PATHS = [
  "**/node_modules/**",
  "**/.git/**",
  "**/.next/**",
  "**/dist/**",
  "**/build/**",
  "**/.mcp-data/**",
  "**/.cache/**",
  "**/package-lock.json",
];

export const VECTOR_STORE_UNAVAILABLE_CODE = "E_VECTOR_STORE_UNAVAILABLE";
export const EMBEDDING_STORE_MISSING_CODE = "E_EMBEDDING_STORE_MISSING";

import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { randomUUID } from "crypto";
import { ChromaClient } from "chromadb";
import { OpenAIEmbeddings } from "@langchain/openai";
import fg from "fast-glob";
import { MCP_ERROR_CODES } from "./index.js";

const DEFAULT_COLLECTION_NAME = "ai-chat-workspace";
const DEFAULT_CHROMA_URL = "http://localhost:8000";
const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";

const DEFAULT_ALLOWED_EXTENSIONS = new Set([
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

const DEFAULT_CHUNK_SIZE = 1200;
const DEFAULT_CHUNK_OVERLAP = 200;
const DEFAULT_BATCH_SIZE = 64;

const IGNORED_PATHS = [
  "**/node_modules/**",
  "**/.git/**",
  "**/.next/**",
  "**/dist/**",
  "**/build/**",
  "**/.mcp-data/**",
  "**/.cache/**",
];

const VECTOR_STORE_UNAVAILABLE_CODE =
  MCP_ERROR_CODES.VECTOR_STORE_UNAVAILABLE || "E_VECTOR_STORE_UNAVAILABLE";

const newlineIndicesFor = (text) => {
  const indices = [-1];
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "\n") {
      indices.push(i);
    }
  }
  return indices;
};

const lineNumberAt = (indices, position) => {
  let low = 0;
  let high = indices.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (indices[mid] === position) {
      return mid + 1;
    }
    if (indices[mid] < position) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return low;
};

const chunkContent = (content, options = {}) => {
  const { chunkSize = DEFAULT_CHUNK_SIZE, chunkOverlap = DEFAULT_CHUNK_OVERLAP } = options;
  const length = content.length;
  const newlineIdx = newlineIndicesFor(content);
  const chunks = [];

  let start = 0;

  while (start < length) {
    let end = Math.min(start + chunkSize, length);

    if (end < length) {
      const nextNewline = content.indexOf("\n", end);
      if (nextNewline !== -1 && nextNewline - start <= chunkSize * 1.4) {
        end = nextNewline + 1;
      }
    }

    const raw = content.slice(start, end);
    const trimmed = raw.trim();
    if (trimmed.length > 0) {
      const startLine = lineNumberAt(newlineIdx, start + 1);
      const endLine = lineNumberAt(newlineIdx, end);
      chunks.push({
        content: trimmed,
        metadata: {
          startLine,
          endLine,
        },
      });
    }

    if (end >= length) break;
    start = Math.max(0, end - chunkOverlap);
  }

  return chunks;
};

const buildDocuments = async (rootDir, options = {}) => {
  const { allowedExtensions = DEFAULT_ALLOWED_EXTENSIONS } = options;

  const patterns = Array.from(allowedExtensions).map((ext) => `**/*${ext}`);
  const filePaths = await fg(patterns, {
    cwd: rootDir,
    absolute: true,
    ignore: IGNORED_PATHS,
    dot: false,
    followSymbolicLinks: false,
  });

  const docs = [];

  for (const absolutePath of filePaths) {
    try {
      const content = await fs.readFile(absolutePath, "utf8");
      const relativePath = path.relative(rootDir, absolutePath);
      const chunks = chunkContent(content, options);
      chunks.forEach((chunk) => {
        docs.push({
          content: chunk.content,
          metadata: {
            relativePath,
            startLine: chunk.metadata.startLine,
            endLine: chunk.metadata.endLine,
          },
        });
      });
    } catch (error) {
      console.warn(`[MCP] Failed to read ${absolutePath}: ${error.message}`);
    }
  }

  return docs;
};

export class WorkspaceIndexer {
  constructor(options = {}) {
    const {
      rootDir = process.cwd(),
      chromaUrl = process.env.CHROMA_URL || DEFAULT_CHROMA_URL,
      collectionName =
        process.env.CHAT_ASSISTANT_COLLECTION || DEFAULT_COLLECTION_NAME,
      embeddingModel = DEFAULT_EMBEDDING_MODEL,
      allowedExtensions = DEFAULT_ALLOWED_EXTENSIONS,
      chunkSize = DEFAULT_CHUNK_SIZE,
      chunkOverlap = DEFAULT_CHUNK_OVERLAP,
      openAiApiKey = process.env.OPENAI_API_KEY,
      skipDelete = false,
      batchSize = DEFAULT_BATCH_SIZE,
    } = options;

    if (!openAiApiKey) {
      throw new Error(
        "OPENAI_API_KEY is required to build the MCP embedding index."
      );
    }

    this.rootDir = path.resolve(rootDir);
    this.collectionName = collectionName;
    this.chromaUrl = chromaUrl;
    this.embeddingModel = embeddingModel;
    this.allowedExtensions = allowedExtensions;
    this.chunkSize = chunkSize;
    this.chunkOverlap = chunkOverlap;
    this.openAiApiKey = openAiApiKey;
    this.skipDelete = Boolean(skipDelete);
    this.batchSize = batchSize;

    this.embeddings = new OpenAIEmbeddings({
      apiKey: this.openAiApiKey,
      model: this.embeddingModel,
    });
  }

  static #isUnavailable(error) {
    const codes = new Set([
      "ECONNREFUSED",
      "ECONNRESET",
      "ENOTFOUND",
      "EAI_AGAIN",
      "ETIMEDOUT",
    ]);
    const errorCode = error?.code || error?.cause?.code;
    if (errorCode && codes.has(errorCode)) {
      return true;
    }

    const message = (error?.message || "").toLowerCase();
    if (!message) {
      return false;
    }

    return (
      message.includes("failed to fetch") ||
      message.includes("connect") ||
      message.includes("bad gateway") ||
      message.includes("timeout")
    );
  }

  static #unavailableError(chromaUrl, originalError) {
    const error = new Error(
      `Unable to reach Chroma vector store at ${chromaUrl}. Ensure the service is running and reachable.`
    );
    error.code = VECTOR_STORE_UNAVAILABLE_CODE;
    error.cause = originalError;
    return error;
  }

  async buildEmbeddingStore() {
    if (!existsSync(this.rootDir)) {
      throw new Error(`Root directory not found: ${this.rootDir}`);
    }

    const documents = await buildDocuments(this.rootDir, {
      allowedExtensions: this.allowedExtensions,
      chunkSize: this.chunkSize,
      chunkOverlap: this.chunkOverlap,
    });

    if (documents.length === 0) {
      throw new Error("No indexable documents were found in the workspace.");
    }

    const client = new ChromaClient({ path: this.chromaUrl });
    try {
      await client.heartbeat();
    } catch (error) {
      if (WorkspaceIndexer.#isUnavailable(error)) {
        throw WorkspaceIndexer.#unavailableError(this.chromaUrl, error);
      }
      console.warn(`[MCP] Heartbeat failed: ${error.message}`);
    }

    if (!this.skipDelete) {
      try {
        await client.deleteCollection({ name: this.collectionName });
        console.info(
          `[MCP] Deleted existing Chroma collection "${this.collectionName}".`
        );
      } catch (error) {
        if (WorkspaceIndexer.#isUnavailable(error)) {
          throw WorkspaceIndexer.#unavailableError(this.chromaUrl, error);
        }

        if (!error?.message?.includes("not found")) {
          console.warn(
            `[MCP] Could not delete existing collection: ${error.message}`
          );
        }
      }
    } else {
      console.info(
        `[MCP] Skipping delete step for collection "${this.collectionName}" (skip-delete enabled).`
      );
    }

    const collection = await client.getOrCreateCollection({
      name: this.collectionName,
    });

    for (let index = 0; index < documents.length; index += this.batchSize) {
      const batch = documents.slice(index, index + this.batchSize);
      const texts = batch.map((doc) => doc.content);
      const metadatas = batch.map((doc) => doc.metadata);
      const ids = batch.map(() => randomUUID());

      const embeddings = await this.embeddings.embedDocuments(texts);
      await collection.add({
        ids,
        embeddings,
        documents: texts,
        metadatas,
      });
    }

    return {
      chunks: documents.length,
      collectionName: this.collectionName,
      chromaUrl: this.chromaUrl,
    };
  }
}

export const createWorkspaceIndexer = (options = {}) =>
  new WorkspaceIndexer(options);

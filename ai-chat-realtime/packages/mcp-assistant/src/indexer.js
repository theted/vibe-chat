import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { randomUUID } from "crypto";
import { ChromaClient } from "chromadb";
import { OpenAIEmbeddings } from "@langchain/openai";
import fg from "fast-glob";
import {
  DEFAULT_ALLOWED_EXTENSIONS,
  DEFAULT_BATCH_SIZE,
  DEFAULT_CHROMA_URL,
  DEFAULT_CHUNK_OVERLAP,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_COLLECTION_NAME,
  DEFAULT_EMBEDDING_MODEL,
  IGNORED_PATHS,
  VECTOR_STORE_UNAVAILABLE_CODE,
} from "./constants.js";

// Sanitize text to ensure valid JSON serialization
// Uses toWellFormed() if available (Node 20+), otherwise manual fix
const sanitizeText = (text) => {
  if (!text) return text;

  // Node 20+ has String.prototype.toWellFormed()
  if (typeof text.toWellFormed === 'function') {
    return text.toWellFormed();
  }

  // Fallback for older Node versions
  // Split into code points and rebuild, replacing lone surrogates
  const codePoints = [];
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);

    if (code >= 0xD800 && code <= 0xDBFF) {
      // High surrogate
      const nextCode = text.charCodeAt(i + 1);
      if (nextCode >= 0xDC00 && nextCode <= 0xDFFF) {
        // Valid pair
        codePoints.push(text.codePointAt(i));
        i += 1;
      } else {
        // Lone high surrogate
        codePoints.push(0xFFFD);
      }
    } else if (code >= 0xDC00 && code <= 0xDFFF) {
      // Lone low surrogate
      codePoints.push(0xFFFD);
    } else {
      codePoints.push(code);
    }
  }

  return String.fromCodePoint(...codePoints);
};

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

const extractComponentInfo = (content, relativePath) => {
  const info = {};

  // Extract component/function names from file
  const componentMatch = content.match(/(?:export\s+(?:default\s+)?(?:function|const)\s+(\w+)|const\s+(\w+)\s*=.*?(?:React\.)?(?:memo|forwardRef))/);
  if (componentMatch) {
    const name = componentMatch[1] || componentMatch[2];
    info.componentName = sanitizeText(name);
  }

  // Extract file type
  const ext = path.extname(relativePath);
  info.fileType = sanitizeText(ext);

  // Detect if React component
  if (content.includes('import React') || content.includes('from \'react\'') || content.includes('from "react"')) {
    info.isReactComponent = true;
  }

  return info;
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
      const rawContent = await fs.readFile(absolutePath, "utf8");
      const content = sanitizeText(rawContent);
      const rawRelativePath = path.relative(rootDir, absolutePath);
      const relativePath = sanitizeText(rawRelativePath);
      const fileInfo = extractComponentInfo(content, relativePath);
      const chunks = chunkContent(content, options);

      chunks.forEach((chunk) => {
        // Ensure all text is sanitized
        const sanitizedContent = sanitizeText(chunk.content);

        // Test if this document can be JSON serialized
        try {
          JSON.stringify(sanitizedContent);
        } catch (err) {
          console.warn(`[MCP] Skipping chunk from ${relativePath} - invalid Unicode after sanitization`);
          return;
        }

        docs.push({
          content: sanitizedContent,
          metadata: {
            relativePath,
            startLine: chunk.metadata.startLine,
            endLine: chunk.metadata.endLine,
            ...fileInfo,
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

        // Suppress "not found" errors - collection didn't exist, which is fine
        const message = (error?.message || "").toLowerCase();
        const isNotFound = message.includes("not found") || message.includes("could not be found");
        if (!isNotFound) {
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

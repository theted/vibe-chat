import path from "path";
import { existsSync } from "fs";
import { randomUUID } from "crypto";
import type { ChromaClient } from "chromadb";

import {
  createChromaClient,
  getCollectionOrNull,
  isMissingCollection,
  readFingerprint,
  rethrowChromaError,
} from "./chroma.js";
import {
  DEFAULT_ALLOWED_EXTENSIONS,
  DEFAULT_BATCH_SIZE,
  DEFAULT_CHROMA_URL,
  DEFAULT_CHUNK_OVERLAP,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_COLLECTION_NAME,
  EMBEDDING_MODEL_METADATA_KEY,
  FINGERPRINT_METADATA_KEY,
} from "./constants.js";
import { createEmbedder, type Embedder } from "./embeddings.js";
import {
  buildWorkspaceDocuments,
  computeWorkspaceFingerprint,
  type WorkspaceScanOptions,
} from "./workspaceDocuments.js";

type EmbeddingStoreResult = {
  chunks: number;
  collectionName: string;
  chromaUrl: string;
};

export type IndexFreshness = "missing" | "stale" | "current";

export type WorkspaceIndexerOptions = {
  rootDir?: string;
  chromaUrl?: string;
  collectionName?: string;
  allowedExtensions?: Set<string>;
  chunkSize?: number;
  chunkOverlap?: number;
  skipDelete?: boolean;
  batchSize?: number;
  embedder?: Embedder;
};

/**
 * Builds and manages an embedding index for the local workspace.
 */
export class WorkspaceIndexer {
  rootDir: string;
  collectionName: string;
  chromaUrl: string;
  skipDelete: boolean;
  batchSize: number;
  embedder: Embedder;
  client: ChromaClient;
  scanOptions: WorkspaceScanOptions;

  constructor(options: WorkspaceIndexerOptions = {}) {
    const {
      rootDir = process.cwd(),
      chromaUrl = process.env.CHROMA_URL || DEFAULT_CHROMA_URL,
      collectionName = process.env.CHAT_ASSISTANT_COLLECTION ||
        DEFAULT_COLLECTION_NAME,
      allowedExtensions = DEFAULT_ALLOWED_EXTENSIONS,
      chunkSize = DEFAULT_CHUNK_SIZE,
      chunkOverlap = DEFAULT_CHUNK_OVERLAP,
      skipDelete = false,
      batchSize = DEFAULT_BATCH_SIZE,
      embedder = createEmbedder(),
    } = options;

    this.rootDir = path.resolve(rootDir);
    this.collectionName = collectionName;
    this.chromaUrl = chromaUrl;
    this.skipDelete = Boolean(skipDelete);
    this.batchSize = batchSize;
    this.embedder = embedder;
    this.client = createChromaClient(chromaUrl);
    this.scanOptions = {
      allowedExtensions,
      chunkSize,
      chunkOverlap,
      embedderId: embedder.id,
    };
  }

  /** Compares the stored fingerprint against the files on disk. */
  async checkFreshness(): Promise<IndexFreshness> {
    const collection = await getCollectionOrNull(
      this.client,
      this.chromaUrl,
      this.collectionName,
    );
    if (!collection) return "missing";

    const current = await computeWorkspaceFingerprint(
      this.rootDir,
      this.scanOptions,
    );
    return readFingerprint(collection) === current ? "current" : "stale";
  }

  async buildEmbeddingStore(): Promise<EmbeddingStoreResult> {
    if (!existsSync(this.rootDir)) {
      throw new Error(`Root directory not found: ${this.rootDir}`);
    }

    const { documents, fingerprint } = await buildWorkspaceDocuments(
      this.rootDir,
      this.scanOptions,
    );

    if (documents.length === 0) {
      throw new Error("No indexable documents were found in the workspace.");
    }

    try {
      await this.client.heartbeat();
    } catch (error) {
      rethrowChromaError(this.chromaUrl, error);
    }

    if (!this.skipDelete) {
      try {
        await this.client.deleteCollection({ name: this.collectionName });
        console.info(
          `[MCP] Deleted existing Chroma collection "${this.collectionName}".`,
        );
      } catch (error) {
        // Nothing to delete on a first build
        if (!isMissingCollection(error)) {
          rethrowChromaError(this.chromaUrl, error);
        }
      }
    } else {
      console.info(
        `[MCP] Skipping delete step for collection "${this.collectionName}" (skip-delete enabled).`,
      );
    }

    // embeddingFunction: null - vectors are always computed here, so Chroma
    // must not try to load its own default embedder
    const collection = await this.client.getOrCreateCollection({
      name: this.collectionName,
      embeddingFunction: null,
    });

    for (let index = 0; index < documents.length; index += this.batchSize) {
      const batch = documents.slice(index, index + this.batchSize);
      const texts = batch.map((doc) => doc.content);
      const embeddings = await this.embedder.embed(texts);
      await collection.add({
        ids: batch.map(() => randomUUID()),
        embeddings,
        documents: texts,
        metadatas: batch.map((doc) => doc.metadata),
      });
    }

    // Written last: a build that dies midway leaves no fingerprint, so the
    // next startup sees it as stale and rebuilds
    await collection.modify({
      metadata: {
        [FINGERPRINT_METADATA_KEY]: fingerprint,
        [EMBEDDING_MODEL_METADATA_KEY]: this.embedder.id,
      },
    });

    return {
      chunks: documents.length,
      collectionName: this.collectionName,
      chromaUrl: this.chromaUrl,
    };
  }
}

/**
 * Create a workspace indexer with the provided options.
 * @param options - Workspace indexer configuration.
 */
export const createWorkspaceIndexer = (
  options: WorkspaceIndexerOptions = {},
): WorkspaceIndexer => new WorkspaceIndexer(options);

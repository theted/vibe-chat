import type { ChromaClient } from "chromadb";

import {
  createChromaClient,
  getCollectionOrNull,
  rethrowChromaError,
} from "./chroma.js";
import { SEARCH_MAX_RESULTS } from "./constants.js";
import type { Embedder } from "./embeddings.js";

export type CodeSnippet = {
  relativePath: string;
  startLine: number | null;
  endLine: number | null;
  content: string;
  /** Squared L2 distance (Chroma's default metric): lower is closer */
  distance: number | null;
};

type SnippetMetadata = {
  relativePath?: string;
  startLine?: number;
  endLine?: number;
};

export class MissingIndexError extends Error {}

/** Semantic search over the Chroma index the WorkspaceIndexer builds. */
export class CodebaseSearch {
  readonly chromaUrl: string;
  readonly collectionName: string;
  private readonly client: ChromaClient;
  private readonly embedder: Embedder;

  constructor(options: {
    chromaUrl: string;
    collectionName: string;
    embedder: Embedder;
  }) {
    this.chromaUrl = options.chromaUrl;
    this.collectionName = options.collectionName;
    this.embedder = options.embedder;
    this.client = createChromaClient(options.chromaUrl);
  }

  /** True when the collection exists; throws E_VECTOR_STORE_UNAVAILABLE if Chroma is down. */
  async hasIndex(): Promise<boolean> {
    const collection = await getCollectionOrNull(
      this.client,
      this.chromaUrl,
      this.collectionName,
    );
    return collection !== null;
  }

  async search(query: string, limit: number): Promise<CodeSnippet[]> {
    const collection = await getCollectionOrNull(
      this.client,
      this.chromaUrl,
      this.collectionName,
    );
    if (!collection) {
      throw new MissingIndexError(
        `The code index "${this.collectionName}" has not been built yet.`,
      );
    }

    const [queryEmbedding] = await this.embedder.embed([query]);
    try {
      const result = await collection.query<SnippetMetadata>({
        queryEmbeddings: [queryEmbedding],
        nResults: Math.min(Math.max(1, limit), SEARCH_MAX_RESULTS),
        include: ["documents", "metadatas", "distances"],
      });
      const documents = result.documents[0] ?? [];
      const metadatas = result.metadatas[0] ?? [];
      const distances = result.distances[0] ?? [];

      return documents.flatMap((content, index) => {
        if (!content) return [];
        const metadata = metadatas[index] ?? {};
        return [
          {
            relativePath: metadata.relativePath ?? "unknown",
            startLine: metadata.startLine ?? null,
            endLine: metadata.endLine ?? null,
            content,
            distance: distances[index] ?? null,
          },
        ];
      });
    } catch (error) {
      return rethrowChromaError(this.chromaUrl, error);
    }
  }
}

export const formatSnippetLocation = (snippet: CodeSnippet): string =>
  snippet.startLine && snippet.endLine
    ? `${snippet.relativePath}:${snippet.startLine}-${snippet.endLine}`
    : snippet.relativePath;

/** Numbered chunks headed by `path:start-end`: what the agent and MCP clients read */
export const formatSnippets = (snippets: CodeSnippet[]): string =>
  snippets
    .map(
      (snippet, index) =>
        `[${index + 1}] ${formatSnippetLocation(snippet)}\n${snippet.content}`,
    )
    .join("\n\n---\n\n");

import fs from "fs/promises";
import path from "path";
import { createLocalCodeMcpServer } from "./index.js";

const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 200;
const DEFAULT_BATCH_SIZE = 5;

const ensureDirectory = async (dirPath) => {
  await fs.mkdir(dirPath, { recursive: true });
};

const countLinesUpTo = (content, endIndex) =>
  content.slice(0, endIndex).split("\n").length;

const l2Norm = (vector) => {
  let sum = 0;
  for (let i = 0; i < vector.length; i += 1) {
    sum += vector[i] * vector[i];
  }
  return Math.sqrt(sum);
};

const chunkContent = (content, options = {}) => {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    chunkOverlap = DEFAULT_CHUNK_OVERLAP,
  } = options;

  const chunks = [];
  let start = 0;
  const length = content.length;

  while (start < length) {
    const end = Math.min(start + chunkSize, length);
    const chunkText = content.slice(start, end);
    const startLine = countLinesUpTo(content, start) || 1;
    const endLine = countLinesUpTo(content, end);

    chunks.push({
      content: chunkText,
      start,
      end,
      startLine,
      endLine,
    });

    if (end >= length) break;
    start += chunkSize - chunkOverlap;
  }

  return chunks;
};

export class WorkspaceIndexer {
  constructor(options = {}) {
    const {
      rootDir = process.cwd(),
      chunkSize = DEFAULT_CHUNK_SIZE,
      chunkOverlap = DEFAULT_CHUNK_OVERLAP,
      batchSize = DEFAULT_BATCH_SIZE,
      embeddingStorePath,
    } = options;

    this.rootDir = rootDir;
    this.chunkSize = chunkSize;
    this.chunkOverlap = chunkOverlap;
    this.batchSize = batchSize;

    this.server = createLocalCodeMcpServer({
      rootDir,
      embeddingStorePath,
    });
  }

  async buildEmbeddingStore() {
    const resources = await this.server.listResources();
    if (resources.length === 0) {
      throw new Error("No indexable resources found in workspace.");
    }

    const chunks = [];
    for (const resource of resources) {
      const content = await this.server.readResource(resource.relativePath);
      const fileChunks = chunkContent(content, {
        chunkSize: this.chunkSize,
        chunkOverlap: this.chunkOverlap,
      }).map((chunk, index) => ({
        id: `${resource.relativePath}#${index}`,
        relativePath: resource.relativePath,
        content: chunk.content,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
      }));

      chunks.push(...fileChunks);
    }

    if (chunks.length === 0) {
      throw new Error("No chunks generated from workspace files.");
    }

    const embeddings = await this.generateEmbeddings(chunks);
    const nowIso = new Date().toISOString();

    const payload = {
      version: 1,
      createdAt: nowIso,
      updatedAt: nowIso,
      embeddingModel: this.server.embeddingModel,
      completionModel: this.server.completionModel,
      chunkSize: this.chunkSize,
      chunkOverlap: this.chunkOverlap,
      rootDir: this.rootDir,
      chunks: embeddings,
    };

    await this.writeEmbeddingStore(payload);
    return {
      chunks: embeddings.length,
      storePath: this.server.embeddingStorePath,
    };
  }

  async generateEmbeddings(chunks) {
    const results = [];
    for (let i = 0; i < chunks.length; i += this.batchSize) {
      const batch = chunks.slice(i, i + this.batchSize);
      const inputs = batch.map((chunk) => chunk.content);
      const embeddings = await this.server.embedText(inputs);

      if (Array.isArray(embeddings)) {
        embeddings.forEach((embedding, index) => {
          const chunk = batch[index];
          results.push({
            ...chunk,
            embedding: Array.from(embedding),
            embeddingNorm: l2Norm(embedding),
          });
        });
      } else {
        const chunk = batch[0];
        results.push({
          ...chunk,
          embedding: Array.from(embeddings),
          embeddingNorm: l2Norm(embeddings),
        });
      }
    }
    return results;
  }

  async writeEmbeddingStore(payload) {
    const dir = path.dirname(this.server.embeddingStorePath);
    await ensureDirectory(dir);
    await fs.writeFile(
      this.server.embeddingStorePath,
      JSON.stringify(payload, null, 2),
      "utf8"
    );
  }
}

export const createWorkspaceIndexer = (options = {}) =>
  new WorkspaceIndexer(options);

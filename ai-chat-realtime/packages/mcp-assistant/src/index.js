import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { OpenAI } from "openai";

const DEFAULT_IGNORE_DIRS = new Set(["node_modules", ".git"]);
const DEFAULT_IGNORE_FILES = new Set([".env"]);
const DEFAULT_ALLOWED_EXTENSIONS = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".json",
  ".md",
]);

const DEFAULT_MAX_FILE_SIZE = 512 * 1024;
const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
const DEFAULT_COMPLETION_MODEL = "gpt-4o-mini";
const DEFAULT_EMBEDDING_STORE = ".mcp-data/embeddings.json";

const ensureArray = (maybeArray) =>
  Array.isArray(maybeArray) ? maybeArray : [maybeArray];

const toFloatArray = (vector) => Float32Array.from(vector);

const vectorNorm = (vector) => {
  let sum = 0;
  for (let i = 0; i < vector.length; i += 1) {
    sum += vector[i] * vector[i];
  }
  return Math.sqrt(sum);
};

const cosineSimilarity = (a, b, normA, normB) => {
  if (a.length !== b.length) {
    throw new Error("Embedding vector sizes do not match.");
  }

  let dot = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
  }
  const denom = normA * normB;
  return denom === 0 ? 0 : dot / denom;
};

export class LocalCodeMcpServer {
  constructor(options = {}) {
    const {
      rootDir = process.cwd(),
      ignoreDirs = DEFAULT_IGNORE_DIRS,
      ignoreFiles = DEFAULT_IGNORE_FILES,
      allowedExtensions = DEFAULT_ALLOWED_EXTENSIONS,
      maxFileSize = DEFAULT_MAX_FILE_SIZE,
      embeddingModel = DEFAULT_EMBEDDING_MODEL,
      completionModel = DEFAULT_COMPLETION_MODEL,
      embeddingStorePath = DEFAULT_EMBEDDING_STORE,
      openAiApiKey = process.env.OPENAI_API_KEY,
    } = options;

    if (!rootDir) {
      throw new Error("rootDir is required to initialise LocalCodeMcpServer.");
    }

    this.rootDir = path.resolve(rootDir);
    this.ignoreDirs = new Set(ignoreDirs);
    this.ignoreFiles = new Set(ignoreFiles);
    this.allowedExtensions = new Set(allowedExtensions);
    this.maxFileSize = maxFileSize;
    this.embeddingModel = embeddingModel;
    this.completionModel = completionModel;
    this.embeddingStorePath = path.isAbsolute(embeddingStorePath)
      ? embeddingStorePath
      : path.resolve(this.rootDir, embeddingStorePath);
    this.openAiApiKey = openAiApiKey;

    this.embeddingStore = null;
    this.openAiClient = null;
  }

  isPathAllowed(relativePath, { isDirectory = false } = {}) {
    if (!relativePath || relativePath.startsWith("..")) {
      return false;
    }

    const segments = relativePath.split(path.sep);
    if (segments.some((segment) => this.ignoreDirs.has(segment))) {
      return false;
    }

    if (segments.some((segment) => this.ignoreFiles.has(segment))) {
      return false;
    }

    if (!isDirectory) {
      const ext = path.extname(relativePath);
      if (ext && !this.allowedExtensions.has(ext)) {
        return false;
      }
      const basename = path.basename(relativePath);
      if (this.ignoreFiles.has(basename)) {
        return false;
      }
    }

    return true;
  }

  async listResources() {
    const resources = [];
    await this.#walkDirectory(this.rootDir, resources);
    return resources;
  }

  async #walkDirectory(currentDir, resources) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);
      const relativePath = path.relative(this.rootDir, absolutePath);
      const isDirectory = entry.isDirectory();

      if (!this.isPathAllowed(relativePath, { isDirectory })) {
        continue;
      }

      if (isDirectory) {
        await this.#walkDirectory(absolutePath, resources);
        continue;
      }

      const stats = await fs.stat(absolutePath);
      if (stats.size > this.maxFileSize) {
        continue;
      }

      resources.push({
        relativePath,
        size: stats.size,
        modifiedAt: stats.mtime.toISOString(),
      });
    }
  }

  async readResource(relativePath) {
    if (!this.isPathAllowed(relativePath)) {
      throw new Error(`Access to ${relativePath} is not permitted.`);
    }

    const absolutePath = path.join(this.rootDir, relativePath);
    const stats = await fs.stat(absolutePath);
    if (!stats.isFile()) {
      throw new Error(`Resource ${relativePath} is not a regular file.`);
    }

    if (stats.size > this.maxFileSize) {
      throw new Error(`Resource ${relativePath} exceeds maximum readable size.`);
    }

    return fs.readFile(absolutePath, "utf8");
  }

  async loadEmbeddingStore() {
    if (!existsSync(this.embeddingStorePath)) {
      throw new Error(
        `Embedding store not found at ${this.embeddingStorePath}. Run the indexing script first.`
      );
    }

    const raw = await fs.readFile(this.embeddingStorePath, "utf8");
    const parsed = JSON.parse(raw);
    const chunks = parsed.chunks || [];

    const processedChunks = chunks.map((chunk) => {
      const vector = toFloatArray(chunk.embedding);
      const norm = chunk.embeddingNorm || vectorNorm(vector);
      return {
        ...chunk,
        embedding: vector,
        embeddingNorm: norm,
      };
    });

    this.embeddingStore = {
      ...parsed,
      chunks: processedChunks,
    };

    return this.embeddingStore;
  }

  hasEmbeddingStore() {
    return this.embeddingStore !== null;
  }

  async ensureEmbeddingStore() {
    if (this.embeddingStore) {
      return this.embeddingStore;
    }
    return this.loadEmbeddingStore();
  }

  ensureOpenAIClient() {
    if (this.openAiClient) {
      return this.openAiClient;
    }
    if (!this.openAiApiKey) {
      throw new Error(
        "OPENAI_API_KEY is required to perform embeddings or completions."
      );
    }
    this.openAiClient = new OpenAI({ apiKey: this.openAiApiKey });
    return this.openAiClient;
  }

  async embedText(text) {
    const client = this.ensureOpenAIClient();
    const response = await client.embeddings.create({
      model: this.embeddingModel,
      input: ensureArray(text),
    });

    const embeddings = response.data.map((item) => toFloatArray(item.embedding));
    return embeddings.length === 1 ? embeddings[0] : embeddings;
  }

  async getRelevantChunks(question, options = {}) {
    const { topK = 6 } = options;
    const store = await this.ensureEmbeddingStore();
    if (!store || !store.chunks || store.chunks.length === 0) {
      return [];
    }

    const queryEmbedding = await this.embedText(question);
    const queryNorm = vectorNorm(queryEmbedding);

    const scored = store.chunks.map((chunk) => ({
      ...chunk,
      score: cosineSimilarity(
        queryEmbedding,
        chunk.embedding,
        queryNorm,
        chunk.embeddingNorm
      ),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  async answerQuestion(question, options = {}) {
    const {
      topK = 5,
      minScore = 0.15,
      fallbackToSummary = true,
      includeSnippets = true,
    } = options;

    const relevantChunks = await this.getRelevantChunks(question, { topK });
    const pruned = relevantChunks.filter((chunk) => chunk.score >= minScore);

    if (pruned.length === 0) {
      return {
        answer: `I could not find any indexed code related to "${question}".`,
        contexts: [],
      };
    }

    const contexts = pruned.map((chunk, index) => ({
      id: index + 1,
      relativePath: chunk.relativePath,
      startLine: chunk.startLine,
      endLine: chunk.endLine,
      content: chunk.content,
      score: chunk.score,
    }));

    let answer = null;
    if (fallbackToSummary) {
      try {
        answer = await this.generateSummaryFromContexts(question, contexts);
      } catch (error) {
        answer = null;
      }
    }

    if (!answer && includeSnippets) {
      const lines = contexts.map(
        (ctx) =>
          `- [${ctx.id}] ${ctx.relativePath}:${ctx.startLine} – ${ctx.content
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 160)}`
      );
      answer = [
        `Relevant code snippets for "${question}":`,
        ...lines,
      ].join("\n");
    }

    return {
      answer,
      contexts,
    };
  }

  async generateSummaryFromContexts(question, contexts = []) {
    if (contexts.length === 0) {
      return null;
    }

    const client = this.ensureOpenAIClient();
    const contextBlocks = contexts
      .map(
        (ctx) =>
          `[${ctx.id}] File: ${ctx.relativePath} (lines ${ctx.startLine}-${ctx.endLine})\n${ctx.content}`
      )
      .join("\n\n");

    const messages = [
      {
        role: "system",
        content:
          "You are an internal code assistant. Answer the user's question using ONLY the provided context snippets. Reference snippets as [id] when citing them. If context is insufficient, say so explicitly.",
      },
      {
        role: "user",
        content: `Question: ${question}\n\nContext:\n${contextBlocks}\n\nAnswer:`,
      },
    ];

    const response = await client.chat.completions.create({
      model: this.completionModel,
      messages,
      temperature: 0.2,
      max_tokens: 500,
    });

    const choice = response.choices?.[0]?.message?.content;
    return choice?.trim() || null;
  }
}

export const createLocalCodeMcpServer = (options = {}) =>
  new LocalCodeMcpServer(options);

import path from "path";
import { ChromaClient, IncludeEnum } from "chromadb";
import type { IEmbeddingFunction } from "chromadb";
import { OpenAIEmbeddings } from "@langchain/openai";
import { ChatOpenAI } from "@langchain/openai";
import {
  DEFAULT_CHROMA_URL,
  DEFAULT_COLLECTION_NAME,
  DEFAULT_COMPLETION_MODEL,
  DEFAULT_EMBEDDING_MODEL,
  EMBEDDING_STORE_MISSING_CODE,
  VECTOR_STORE_UNAVAILABLE_CODE,
} from "./constants.js";

const CHAT_HISTORY_LIMIT = 5;

type SourceMetadata = {
  relativePath?: string;
  path?: string;
  startLine?: number | null;
  endLine?: number | null;
};

type ErrorWithCode = Error & { code?: string; cause?: { code?: string } };

export type LangChainMcpServerOptions = {
  rootDir?: string;
  chromaUrl?: string;
  collectionName?: string;
  embeddingModel?: string;
  completionModel?: string;
  openAiApiKey?: string;
};

type ChatHistoryMessage = {
  sender?: string;
  displayName?: string;
  alias?: string;
  normalizedAlias?: string;
  senderType?: string;
  content?: string;
};

type NormalizedHistoryMessage = {
  sender: string;
  senderType: string;
  content: string;
};

type AnswerQuestionOptions = {
  topK?: number;
  chatHistory?: ChatHistoryMessage[];
};

type ChromaMetadata = {
  relativePath?: string;
  path?: string;
  startLine?: number | null;
  endLine?: number | null;
  score?: number | null;
};

type AnswerContext = {
  id: number;
  relativePath: string;
  startLine: number | null;
  endLine: number | null;
  content: string;
  score: number | null;
};

type AnswerResult = {
  answer: string;
  contexts: AnswerContext[];
};

type QueryResult = {
  documents?: string[][];
  metadatas?: ChromaMetadata[][];
  distances?: number[][];
};

const buildSourceLabel = (metadata: SourceMetadata | null, index: number) => {
  if (!metadata) return `[${index + 1}]`;
  const base = metadata.relativePath || metadata.path || "unknown";
  const lineInfo =
    metadata.startLine && metadata.endLine
      ? `:${metadata.startLine}-${metadata.endLine}`
      : "";
  return `[${index + 1}] ${base}${lineInfo}`;
};

/**
 * Local MCP server wrapper for vector search and answer generation.
 */
export class LangChainMcpServer {
  rootDir: string;
  chromaUrl: string;
  collectionName: string;
  embeddingModel: string;
  completionModel: string;
  openAiApiKey: string;
  client: ChromaClient;
  embeddings: OpenAIEmbeddings;
  embeddingFunction: IEmbeddingFunction;
  llm: ChatOpenAI;

  constructor(options: LangChainMcpServerOptions = {}) {
    const {
      rootDir = process.cwd(),
      chromaUrl = process.env.CHROMA_URL || DEFAULT_CHROMA_URL,
      collectionName =
        process.env.CHAT_ASSISTANT_COLLECTION || DEFAULT_COLLECTION_NAME,
      embeddingModel = DEFAULT_EMBEDDING_MODEL,
      completionModel = DEFAULT_COMPLETION_MODEL,
      openAiApiKey = process.env.OPENAI_API_KEY,
    } = options;

    if (!openAiApiKey) {
      throw new Error(
        "OPENAI_API_KEY is required to initialise LangChainMcpServer."
      );
    }

    this.rootDir = path.resolve(rootDir);
    this.chromaUrl = chromaUrl;
    this.collectionName = collectionName;
    this.embeddingModel = embeddingModel;
    this.completionModel = completionModel;
    this.openAiApiKey = openAiApiKey;

    console.log(
      `[MCP Debug] Initializing ChromaClient with URL: ${this.chromaUrl}`
    );
    console.log(`[MCP Debug] Target collection: ${this.collectionName}`);

    // Test basic connectivity by parsing URL
    try {
      const url = new URL(this.chromaUrl);
      console.log(
        `[MCP Debug] Parsed Chroma URL - protocol: ${url.protocol}, host: ${url.host}, port: ${url.port || "default"}`
      );
    } catch (error) {
      console.error(
        `[MCP Debug] ❌ Invalid Chroma URL format: ${this.chromaUrl}`
      );
    }

    this.client = new ChromaClient({ path: this.chromaUrl });
    this.embeddings = new OpenAIEmbeddings({
      apiKey: this.openAiApiKey,
      model: this.embeddingModel,
    });
    this.embeddingFunction = {
      generate: async (texts: string[]) =>
        this.embeddings.embedDocuments(texts),
    };

    this.llm = new ChatOpenAI({
      apiKey: this.openAiApiKey,
      model: this.completionModel,
      temperature: 0.2,
    });
  }

  static #isMissingCollection(error: ErrorWithCode) {
    const message = (error?.message || "").toLowerCase();

    // Check if error mentions collection/collections
    const hasCollectionRef = message.includes("collection");
    if (!hasCollectionRef) {
      return false;
    }

    // Check for various "not found" patterns
    return (
      message.includes("not found") ||
      message.includes("could not be found") ||
      message.includes("does not exist") ||
      message.includes("not exist") ||
      message.includes("404")
    );
  }

  static #isUnavailable(error: ErrorWithCode) {
    const codes = new Set([
      "ECONNREFUSED",
      "ECONNRESET",
      "ENOTFOUND",
      "EAI_AGAIN",
      "ETIMEDOUT",
      "ECONNABORTED",
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
      message.includes("fetch error") ||
      message.includes("timeout") ||
      message.includes("econn")
    );
  }

  static #unavailableError(chromaUrl: string, originalError: ErrorWithCode) {
    const error = new Error(
      `Unable to reach Chroma vector store at ${chromaUrl}. Ensure the service is running and reachable.`
    ) as ErrorWithCode;
    error.code = VECTOR_STORE_UNAVAILABLE_CODE;
    error.cause = originalError;
    return error;
  }

  async ensureCollection(): Promise<boolean> {
    console.log(
      `[MCP Debug] Attempting to connect to Chroma at ${this.chromaUrl}`
    );
    console.log(`[MCP Debug] Looking for collection: ${this.collectionName}`);

    try {
      const collection = await this.client.getCollection({
        name: this.collectionName,
        embeddingFunction: this.embeddingFunction,
      });
      console.log(
        `[MCP Debug] ✅ Successfully retrieved collection "${this.collectionName}"`
      );

      const count = await collection.count();
      console.log(`[MCP Debug] Collection contains ${count} documents`);
      return true;
    } catch (error) {
      console.error(`[MCP Debug] ❌ Failed to access collection:`, {
        errorMessage: error.message,
        errorCode: error.code,
        causeCode: error.cause?.code,
        chromaUrl: this.chromaUrl,
        collectionName: this.collectionName,
      });

      if (LangChainMcpServer.#isMissingCollection(error)) {
        console.warn(
          `[MCP] ⚠️  Chroma collection "${this.collectionName}" not found.`
        );
        console.warn(
          `[MCP] To create and populate the collection, run: npm run build && node dist/scripts/index-mcp-chat.js`
        );
        console.warn(
          `[MCP] Or set CHAT_ASSISTANT_AUTO_INDEX=true to auto-create on startup.`
        );
        return false;
      }

      if (LangChainMcpServer.#isUnavailable(error)) {
        console.error(
          `[MCP Debug] Connection to Chroma failed - service appears unreachable`
        );
        throw LangChainMcpServer.#unavailableError(this.chromaUrl, error);
      }

      throw error;
    }
  }

  async ensureEmbeddingStore(): Promise<boolean> {
    const exists = await this.ensureCollection();
    if (!exists) {
      const error = new Error(
        `Embedding store "${this.collectionName}" not found at ${this.chromaUrl}. Run the indexing script first.`
      ) as ErrorWithCode;
      error.code = EMBEDDING_STORE_MISSING_CODE;
      throw error;
    }
    return true;
  }

  async answerQuestion(
    question: string,
    options: AnswerQuestionOptions = {}
  ): Promise<AnswerResult> {
    const { topK = 5, chatHistory = [] } = options;
    const normalizedQuestion = question?.toString().trim() || "";

    const normalizedHistory: NormalizedHistoryMessage[] = Array.isArray(
      chatHistory
    )
      ? chatHistory
          .filter(
            (message) =>
              message &&
              typeof message.content === "string" &&
              message.content.trim()
          )
          .slice(-CHAT_HISTORY_LIMIT)
          .map((message) => ({
            sender:
              message.sender ||
              message.displayName ||
              message.alias ||
              message.normalizedAlias ||
              "participant",
            senderType: message.senderType || "user",
            content: message.content.trim(),
          }))
      : [];

    const historyBlock = normalizedHistory
      .map((message, index) => {
        const speaker = message.senderType === "ai" ? "AI" : "User";
        return `${index + 1}. ${speaker} (${message.sender}): ${message.content}`;
      })
      .join("\n");

    const queryWithHistory = historyBlock
      ? `Primary question: ${normalizedQuestion}\n\nRecent conversation (most recent last, for context):\n${historyBlock}`
      : normalizedQuestion;

    console.log(
      `[MCP Debug] Answering question (topK=${topK}): "${normalizedQuestion}" with ${normalizedHistory.length} history messages`
    );

    let collection: Awaited<
      ReturnType<InstanceType<typeof ChromaClient>["getCollection"]>
    >;
    try {
      console.log(
        `[MCP Debug] Fetching collection "${this.collectionName}" for query...`
      );
      collection = await this.client.getCollection({
        name: this.collectionName,
        embeddingFunction: this.embeddingFunction,
      });
      console.log(`[MCP Debug] ✅ Collection retrieved successfully`);
    } catch (error) {
      console.error(
        `[MCP Debug] ❌ Failed to retrieve collection for query:`,
        error.message
      );
      if (LangChainMcpServer.#isMissingCollection(error as ErrorWithCode)) {
        return {
          answer:
            "I could not find an indexed knowledge base. Run `npm run build && node dist/scripts/index-mcp-chat.js` to build it, then ask again.",
          contexts: [],
        };
      }
      if (LangChainMcpServer.#isUnavailable(error as ErrorWithCode)) {
        throw LangChainMcpServer.#unavailableError(
          this.chromaUrl,
          error as ErrorWithCode
        );
      }
      throw error;
    }

    let queryResult: QueryResult;
    try {
      console.log(`[MCP Debug] Embedding query with OpenAI...`);
      const queryEmbedding = await this.embeddings.embedQuery(
        queryWithHistory || normalizedQuestion
      );
      console.log(`[MCP Debug] Query embedded, searching Chroma collection...`);
      queryResult = (await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: topK,
        include: [
          IncludeEnum.Metadatas,
          IncludeEnum.Documents,
          IncludeEnum.Distances,
        ],
      })) as QueryResult;
      console.log(
        `[MCP Debug] ✅ Query completed, found ${
          queryResult.documents?.[0]?.length || 0
        } results`
      );
    } catch (error) {
      console.error(`[MCP Debug] ❌ Query failed:`, error.message);
      if (LangChainMcpServer.#isUnavailable(error as ErrorWithCode)) {
        throw LangChainMcpServer.#unavailableError(
          this.chromaUrl,
          error as ErrorWithCode
        );
      }
      throw error;
    }

    const documents = queryResult.documents?.[0] ?? [];
    const metadatas = queryResult.metadatas?.[0] ?? [];
    const distances = queryResult.distances?.[0] ?? [];

    if (!documents.length) {
      return {
        answer: `I could not find indexed code related to "${normalizedQuestion}".`,
        contexts: [],
      };
    }

    const contexts: AnswerContext[] = documents.map((content, index) => {
      const metadata = metadatas[index] || {};
      const distance = distances[index];
      return {
        id: index + 1,
        relativePath: metadata.relativePath || metadata.path || "unknown",
        startLine: metadata.startLine || null,
        endLine: metadata.endLine || null,
        content,
        score:
          typeof distance === "number" ? Number(distance) : metadata.score || null,
      };
    });

    const contextBlock = contexts
      .map((ctx, idx) => {
        const label = buildSourceLabel(ctx, idx);
        return `${label}\n${ctx.content}`;
      })
      .join("\n\n");

    const historySection = historyBlock
      ? `Recent chat (most recent last, use for context only and prioritize the latest messages):\n${historyBlock}\n\n`
      : "";

    const promptMessages = [
      {
        role: "system",
        content:
          "You are an internal engineering assistant with access to the project's source code. Answer the user's question using only the provided context snippets. When considering the recent chat history, prioritize the current question and the latest messages over earlier ones. Reference sources using the format [id]. If the context is insufficient, say so explicitly.",
      },
      {
        role: "user",
        content: `Question: ${normalizedQuestion}\n\n${historySection}Context:\n${contextBlock}\n\nAnswer:`,
      },
    ];

    let answerText = null;
    try {
      const completion = await this.llm.invoke(promptMessages);
      answerText = completion?.content?.toString()?.trim() || null;
    } catch (error) {
      answerText = null;
      console.warn(`[MCP] Failed to generate summary answer: ${error.message}`);
    }

    if (!answerText) {
      const fallback = [
        `Here are the most relevant code snippets related to "${normalizedQuestion}":`,
        ...contexts.map(
          (ctx, idx) =>
            `- ${buildSourceLabel(ctx, idx)} – ${ctx.content
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 200)}`
        ),
      ].join("\n");
      answerText = fallback;
    }

    return {
      answer: answerText,
      contexts,
    };
  }
}

/**
 * Create a new LangChain MCP server instance.
 * @param options - MCP server configuration.
 */
export const createLocalCodeMcpServer = (
  options: LangChainMcpServerOptions = {}
): LangChainMcpServer => new LangChainMcpServer(options);

export const MCP_ERROR_CODES = {
  VECTOR_STORE_UNAVAILABLE: VECTOR_STORE_UNAVAILABLE_CODE,
  EMBEDDING_STORE_MISSING: EMBEDDING_STORE_MISSING_CODE,
} as const;

import path from "path";
import { ChromaClient } from "chromadb";
import { OpenAIEmbeddings } from "@langchain/openai";
import { ChatOpenAI } from "@langchain/openai";

const DEFAULT_COLLECTION_NAME = "ai-chat-workspace";
const DEFAULT_CHROMA_URL = "http://localhost:8000";
const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
const DEFAULT_COMPLETION_MODEL = "gpt-4o-mini";

const VECTOR_STORE_UNAVAILABLE_CODE = "E_VECTOR_STORE_UNAVAILABLE";
const EMBEDDING_STORE_MISSING_CODE = "E_EMBEDDING_STORE_MISSING";

const buildSourceLabel = (metadata, index) => {
  if (!metadata) return `[${index + 1}]`;
  const base = metadata.relativePath || metadata.path || "unknown";
  const lineInfo =
    metadata.startLine && metadata.endLine
      ? `:${metadata.startLine}-${metadata.endLine}`
      : "";
  return `[${index + 1}] ${base}${lineInfo}`;
};

export class LangChainMcpServer {
  constructor(options = {}) {
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

    this.client = new ChromaClient({ path: this.chromaUrl });
    this.embeddings = new OpenAIEmbeddings({
      apiKey: this.openAiApiKey,
      model: this.embeddingModel,
    });

    this.llm = new ChatOpenAI({
      apiKey: this.openAiApiKey,
      model: this.completionModel,
      temperature: 0.2,
    });
  }

  static #isMissingCollection(error) {
    const message = (error?.message || "").toLowerCase();
    if (!message.includes("collection")) {
      return false;
    }
    return message.includes("not found") || message.includes("does not exist");
  }

  static #isUnavailable(error) {
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

  static #unavailableError(chromaUrl, originalError) {
    const error = new Error(
      `Unable to reach Chroma vector store at ${chromaUrl}. Ensure the service is running and reachable.`
    );
    error.code = VECTOR_STORE_UNAVAILABLE_CODE;
    error.cause = originalError;
    return error;
  }

  async ensureCollection() {
    try {
      const collection = await this.client.getCollection({
        name: this.collectionName,
      });
      await collection.count();
      return true;
    } catch (error) {
      if (LangChainMcpServer.#isMissingCollection(error)) {
        console.warn(
          `[MCP] Chroma collection "${this.collectionName}" not found yet. Run the indexing script to populate it.`
        );
        return false;
      }

      if (LangChainMcpServer.#isUnavailable(error)) {
        throw LangChainMcpServer.#unavailableError(this.chromaUrl, error);
      }

      throw error;
    }
  }

  async ensureEmbeddingStore() {
    const exists = await this.ensureCollection();
    if (!exists) {
      const error = new Error(
        `Embedding store "${this.collectionName}" not found at ${this.chromaUrl}. Run the indexing script first.`
      );
      error.code = EMBEDDING_STORE_MISSING_CODE;
      throw error;
    }
    return true;
  }

  async answerQuestion(question, options = {}) {
    const { topK = 5 } = options;

    let collection;
    try {
      collection = await this.client.getCollection({
        name: this.collectionName,
      });
    } catch (error) {
      if (LangChainMcpServer.#isMissingCollection(error)) {
        return {
          answer:
            "I could not find an indexed knowledge base. Run `node scripts/index-mcp-chat.js` to build it, then ask again.",
          contexts: [],
        };
      }
      if (LangChainMcpServer.#isUnavailable(error)) {
        throw LangChainMcpServer.#unavailableError(this.chromaUrl, error);
      }
      throw error;
    }

    let queryResult;
    try {
      const queryEmbedding = await this.embeddings.embedQuery(question);
      queryResult = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: topK,
        include: ["metadatas", "documents", "distances"],
      });
    } catch (error) {
      if (LangChainMcpServer.#isUnavailable(error)) {
        throw LangChainMcpServer.#unavailableError(this.chromaUrl, error);
      }
      throw error;
    }

    const documents = queryResult.documents?.[0] || [];
    const metadatas = queryResult.metadatas?.[0] || [];
    const distances = queryResult.distances?.[0] || [];

    if (!documents.length) {
      return {
        answer: `I could not find indexed code related to "${question}".`,
        contexts: [],
      };
    }

    const contexts = documents.map((content, index) => {
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

    const promptMessages = [
      {
        role: "system",
        content:
          "You are an internal engineering assistant with access to the project's source code. Answer the user's question using only the provided context snippets. Reference sources using the format [id]. If the context is insufficient, say so explicitly.",
      },
      {
        role: "user",
        content: `Question: ${question}\n\nContext:\n${contextBlock}\n\nAnswer:`,
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
        `Here are the most relevant code snippets related to "${question}":`,
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

export const createLocalCodeMcpServer = (options = {}) =>
  new LangChainMcpServer(options);

export const MCP_ERROR_CODES = {
  VECTOR_STORE_UNAVAILABLE: VECTOR_STORE_UNAVAILABLE_CODE,
  EMBEDDING_STORE_MISSING: EMBEDDING_STORE_MISSING_CODE,
};

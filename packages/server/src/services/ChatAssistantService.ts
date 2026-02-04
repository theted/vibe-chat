import {
  createLocalCodeMcpServer,
  MCP_ERROR_CODES,
} from "@ai-chat/mcp-assistant";
import { createWorkspaceIndexer } from "@ai-chat/mcp-assistant/indexer";
import type { Server } from "socket.io";

import type { ChatAssistantMetadata, ChatMessage } from "@/types.js";
import { normalizeAlias } from "@/utils/stringUtils.js";
import { withTimeout } from "@/utils/promiseUtils.js";
import { resolveWorkspaceRoot } from "@/utils/workspaceUtils.js";
import {
  enhanceAnswerWithLinks,
  type VectorContext,
} from "@/utils/formatUtils.js";

type ChatAssistantOptions = {
  mentionName?: string;
  projectRoot?: string;
  timeoutMs?: number;
};

type ChatHistoryEntry = {
  sender: string;
  senderType: string;
  content: string;
};

type MCPAnswer = {
  answer?: string;
  contexts?: VectorContext[];
  error?: Error | null;
};

type ErrorWithCode = Error & { code?: string };

type LocalCodeMcpServer = {
  ensureCollection: () => Promise<boolean>;
  answerQuestion: (
    question: string,
    options: { chatHistory?: ChatHistoryEntry[] },
  ) => Promise<MCPAnswer>;
};

type WorkspaceIndexer = {
  buildEmbeddingStore: () => Promise<{
    chunks: number;
    collectionName: string;
    chromaUrl: string;
  }>;
};

type ChatAssistantResponse = {
  question: string;
  answer: string;
  contexts?: VectorContext[];
  error?: Error | null;
};

type ChatAssistantResponseOptions = {
  emitter?: Server | null;
  roomId?: string | null;
  chatHistory?: ChatMessage[];
};

/**
 * Handles @Chat requests using the local MCP assistant.
 */
export class ChatAssistantService {
  name: string;
  displayName: string;
  alias: string;
  normalizedAlias: string;
  projectRoot: string;
  timeoutMs: number;
  mentionRegex: RegExp;
  configUnresolved: boolean;
  autoIndex: boolean;
  chromaUrl: string;
  collectionName: string;
  chatHistoryLimit: number;
  server: LocalCodeMcpServer | null;
  indexPromise: Promise<void> | null;
  vectorStoreReachable: boolean | null;
  collectionReady: boolean | null;
  vectorStoreError: Error | null;

  /**
   * Create a chat assistant service instance.
   * @param options - Optional configuration overrides.
   */
  constructor(options: ChatAssistantOptions = {}) {
    const { mentionName = "Chat", projectRoot, timeoutMs = 15_000 } = options;

    const resolved = resolveWorkspaceRoot({ projectRoot }, import.meta.url);

    this.name = mentionName;
    this.displayName = `@${mentionName}`;
    this.alias = mentionName.toLowerCase();
    this.normalizedAlias = normalizeAlias(this.alias);
    this.projectRoot = resolved.projectRoot;
    this.timeoutMs = timeoutMs;
    this.mentionRegex = new RegExp(`@${mentionName}\\b`, "i");
    this.configUnresolved = resolved.unresolved;
    this.autoIndex =
      String(process.env.CHAT_ASSISTANT_AUTO_INDEX || "")
        .toLowerCase()
        .trim() === "true";

    this.chromaUrl = process.env.CHROMA_URL || "http://localhost:8000";
    this.collectionName =
      process.env.CHAT_ASSISTANT_COLLECTION || "ai-chat-workspace";

    this.chatHistoryLimit = 5;

    this.server = null;
    this.indexPromise = null;
    this.vectorStoreReachable = null;
    this.collectionReady = null;
    this.vectorStoreError = null;
  }

  /**
   * Initialize the MCP assistant and validate the vector store connection.
   */
  async initialise(): Promise<void> {
    if (this.configUnresolved) {
      throw new Error(
        "Unable to locate project root. Set CHAT_ASSISTANT_ROOT or provide projectRoot explicitly.",
      );
    }

    console.log(`[ChatAssistant Debug] Initializing with config:`, {
      projectRoot: this.projectRoot,
      chromaUrl: this.chromaUrl,
      collectionName: this.collectionName,
      autoIndex: this.autoIndex,
    });

    this.server = createLocalCodeMcpServer({
      rootDir: this.projectRoot,
      chromaUrl: this.chromaUrl,
      collectionName: this.collectionName,
      openAiApiKey: process.env.OPENAI_API_KEY,
    }) as LocalCodeMcpServer;

    try {
      console.log(
        `[ChatAssistant Debug] Checking vector store availability...`,
      );
      const { collectionReady } = await this.ensureVectorStoreAvailability();
      console.log(`[ChatAssistant Debug] Vector store check result:`, {
        reachable: this.vectorStoreReachable,
        collectionReady,
      });

      if (!collectionReady && this.autoIndex && this.vectorStoreReachable) {
        console.log(
          `[ChatAssistant Debug] 🔄 Auto-indexing enabled and collection missing - starting background index build...`,
        );
        this.indexPromise = this.buildIndex()
          .then(() => {
            console.log(`[ChatAssistant] ✅ Auto-index completed successfully`);
          })
          .catch((error: Error) => {
            const message =
              error instanceof Error ? error.message : String(error);
            console.error(`[ChatAssistant] ❌ Auto-index failed: ${message}`);
            return null;
          })
          .finally(() => {
            this.indexPromise = null;
          });
      } else if (
        !collectionReady &&
        !this.autoIndex &&
        this.vectorStoreReachable
      ) {
        console.warn(
          `[ChatAssistant] ⚠️  Collection not found and auto-indexing is disabled.`,
        );
        console.warn(`[ChatAssistant] To create the collection, either:`);
        console.warn(
          `[ChatAssistant]   1. Run: npm run build && bun dist/scripts/index-mcp-chat.js`,
        );
        console.warn(
          `[ChatAssistant]   2. Set CHAT_ASSISTANT_AUTO_INDEX=true and restart`,
        );
      }
    } catch (error) {
      if (
        (error as ErrorWithCode)?.code ===
        MCP_ERROR_CODES.VECTOR_STORE_UNAVAILABLE
      ) {
        console.warn(
          `[ChatAssistant] Vector store unreachable (${(error as Error).message}). @Chat will respond with setup guidance until the index becomes available.`,
        );
      } else {
        console.warn(
          `[ChatAssistant] Unable to verify vector store availability: ${(error as Error).message}`,
        );
      }
    }
  }

  /**
   * Metadata describing the assistant for chat messages.
   */
  getMetadata(): ChatAssistantMetadata {
    return {
      sender: this.displayName,
      displayName: this.displayName,
      alias: this.alias,
      normalizedAlias: this.normalizedAlias,
      aiId: "internal_chat_assistant",
      aiName: this.displayName,
    };
  }

  /**
   * Determine if content includes a @Chat mention.
   * @param input - Message or content string.
   */
  shouldHandle(input: unknown): boolean {
    const contentValue =
      input && typeof (input as { content?: unknown }).content === "string"
        ? (input as { content?: string }).content
        : null;
    const content = typeof input === "string" ? input : contentValue || "";
    return Boolean(content && this.mentionRegex.test(content));
  }

  /**
   * Normalize chat history into a compact format for the MCP assistant.
   */
  prepareChatHistory(chatHistory: ChatMessage[] = []): ChatHistoryEntry[] {
    if (!Array.isArray(chatHistory) || chatHistory.length === 0) {
      return [];
    }

    return chatHistory
      .filter(
        (message) =>
          message &&
          typeof message.content === "string" &&
          message.content.trim(),
      )
      .slice(-this.chatHistoryLimit)
      .map((message) => ({
        sender:
          message.displayName ||
          message.sender ||
          message.alias ||
          message.normalizedAlias ||
          "participant",
        senderType: message.senderType || "user",
        content: message.content.trim(),
      }));
  }

  async createResponseFromContent(
    content: string,
    options: ChatAssistantResponseOptions = {},
  ): Promise<ChatAssistantResponse | null> {
    const { emitter = null, roomId = null, chatHistory = [] } = options;
    const emitTyping = (event: string, payload: Record<string, unknown>) => {
      if (!emitter) return;
      const target = roomId ? emitter.to(roomId) : emitter;
      target.emit(event, { roomId, ...payload });
    };

    const question = this.extractQuestion(content);
    if (!question) {
      return null;
    }

    console.info(
      `[ChatAssistant] Generating answer for question: "${question}"`,
    );

    const historyContext = this.prepareChatHistory(chatHistory);

    try {
      if (!this.server) {
        throw new Error("assistant not initialised");
      }

      if (this.indexPromise) {
        try {
          await this.indexPromise;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          console.warn(
            `[ChatAssistant] Background indexing failed: ${message}`,
          );
        }
      }

      emitTyping("ai-generating-start", {
        aiId: "internal_chat_assistant",
        displayName: this.displayName,
        alias: this.alias,
      });

      await this.ensureVectorStoreAvailability();
      if (this.vectorStoreReachable === false) {
        emitTyping("ai-generating-stop", {
          aiId: "internal_chat_assistant",
        });
        return {
          question,
          answer: [
            "I can't reach the shared knowledge index right now.",
            `Check that the Chroma service is running at ${this.chromaUrl} and try re-indexing with \`npm run build && bun dist/scripts/index-mcp-chat.js\`.`,
          ].join(" "),
        };
      }

      let result = await this.server.answerQuestion(question, {
        chatHistory: historyContext,
      });

      if (
        this.autoIndex &&
        (!result.contexts || result.contexts.length === 0) &&
        !this.indexPromise &&
        this.vectorStoreReachable
      ) {
        this.indexPromise = this.buildIndex()
          .catch((error: Error) => {
            const message =
              error instanceof Error ? error.message : String(error);
            console.warn(`[ChatAssistant] Auto-index failed: ${message}`);
            return null;
          })
          .finally(() => {
            this.indexPromise = null;
          });

        try {
          await this.indexPromise;
          await this.ensureVectorStoreAvailability();
          if (this.vectorStoreReachable) {
            result = await this.server.answerQuestion(question, {
              chatHistory: historyContext,
            });
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          console.warn(
            `[ChatAssistant] Failed to rebuild vector index: ${message}`,
          );
        }
      }

      emitTyping("ai-generating-stop", {
        aiId: "internal_chat_assistant",
      });

      const answer =
        result.answer ||
        `I looked for "${question}" but did not find any relevant code snippets.`;
      const contexts = result.contexts || [];

      return {
        question,
        answer: enhanceAnswerWithLinks(answer, contexts),
        contexts,
        error: result.error || null,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      emitTyping("ai-generating-stop", {
        aiId: "internal_chat_assistant",
      });
      return {
        question,
        answer: `I tried to look up "${question}" but ran into an issue (${message}).`,
        error,
      };
    }
  }

  extractQuestion(content = ""): string | null {
    if (!content) {
      return null;
    }

    const match = this.mentionRegex.exec(content);
    if (!match) {
      return null;
    }

    const after = content.slice(match.index + match[0].length);
    const cleaned = after.replace(/^[\s,:-]+/, "").trim();
    return cleaned || null;
  }

  /**
   * Build or rebuild the MCP vector index for the workspace.
   */
  async buildIndex(): Promise<void> {
    await this.ensureVectorStoreAvailability({ throwOnUnavailable: true });

    const indexer = createWorkspaceIndexer({
      rootDir: this.projectRoot,
      chromaUrl: this.chromaUrl,
      collectionName: this.collectionName,
    }) as WorkspaceIndexer;

    const result = await indexer.buildEmbeddingStore();
    console.info(
      `[ChatAssistant] Indexed ${result.chunks} chunks into "${result.collectionName}" at ${result.chromaUrl}`,
    );

    await this.server.ensureCollection();
    this.vectorStoreReachable = true;
    this.collectionReady = true;
    this.vectorStoreError = null;
  }

  async ensureVectorStoreAvailability(
    options: {
      throwOnUnavailable?: boolean;
    } = {},
  ): Promise<{
    reachable: boolean;
    collectionReady: boolean;
    error?: Error;
  }> {
    if (!this.server) {
      this.vectorStoreReachable = false;
      this.collectionReady = false;
      this.vectorStoreError = new Error("assistant not initialised");
      if (options.throwOnUnavailable) {
        throw this.vectorStoreError;
      }
      return {
        reachable: false,
        collectionReady: false,
        error: this.vectorStoreError,
      };
    }

    console.log(
      `[ChatAssistant Debug] Checking vector store availability at ${this.chromaUrl} (timeout: ${this.timeoutMs}ms)`,
    );

    try {
      const timeoutMs = Number.isFinite(this.timeoutMs)
        ? Math.max(0, Number(this.timeoutMs))
        : 0;

      const exists = await withTimeout(
        this.server.ensureCollection(),
        timeoutMs,
        () => {
          const error = new Error(
            `Timed out after ${timeoutMs}ms while contacting the Chroma vector store at ${this.chromaUrl}.`,
          ) as ErrorWithCode;
          error.code = MCP_ERROR_CODES.VECTOR_STORE_UNAVAILABLE;
          return error;
        },
      );
      console.log(
        `[ChatAssistant Debug] ✅ Vector store reachable, collection exists: ${exists}`,
      );
      this.vectorStoreReachable = true;
      this.collectionReady = Boolean(exists);
      this.vectorStoreError = null;
      return {
        reachable: true,
        collectionReady: this.collectionReady,
      };
    } catch (error) {
      console.error(`[ChatAssistant Debug] ❌ Vector store check failed:`, {
        errorMessage: (error as Error).message,
        errorCode: (error as ErrorWithCode).code,
        chromaUrl: this.chromaUrl,
      });

      if (
        (error as ErrorWithCode)?.code ===
        MCP_ERROR_CODES.VECTOR_STORE_UNAVAILABLE
      ) {
        this.vectorStoreReachable = false;
        this.collectionReady = false;
        this.vectorStoreError = error as Error;
        if (options.throwOnUnavailable) {
          throw error;
        }
        return {
          reachable: false,
          collectionReady: false,
          error,
        };
      }
      throw error;
    }
  }
}

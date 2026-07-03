import {
  createLocalCodeMcpServer,
  DEFAULT_CHROMA_URL,
  DEFAULT_COLLECTION_NAME,
  MCP_ERROR_CODES,
} from "@ai-chat/mcp-assistant";

import type { ChatAssistantMetadata, ChatMessage } from "@/types.js";
import { normalizeAlias } from "@/utils/stringUtils.js";
import { resolveWorkspaceRoot } from "@/utils/workspaceUtils.js";
import { createChatAssistantResponse } from "./chatAssistantResponse.js";
import type {
  ChatAssistantOptions,
  ChatAssistantResponse,
  ChatAssistantResponseOptions,
  ChatHistoryEntry,
  ErrorWithCode,
  LocalCodeMcpServer,
} from "./chatAssistantTypes.js";
import {
  buildChatAssistantIndex,
  ensureChatAssistantVectorStoreAvailability,
} from "./chatAssistantVectorStore.js";

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
    this.chromaUrl = process.env.CHROMA_URL || DEFAULT_CHROMA_URL;
    this.collectionName =
      process.env.CHAT_ASSISTANT_COLLECTION || DEFAULT_COLLECTION_NAME;
    this.chatHistoryLimit = 5;
    this.server = null;
    this.indexPromise = null;
    this.vectorStoreReachable = null;
    this.collectionReady = null;
    this.vectorStoreError = null;
  }

  async initialise(): Promise<void> {
    if (this.configUnresolved) {
      throw new Error(
        "Unable to locate project root. Set CHAT_ASSISTANT_ROOT or provide projectRoot explicitly.",
      );
    }

    console.log("[ChatAssistant Debug] Initializing with config:", {
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
        "[ChatAssistant Debug] Checking vector store availability...",
      );
      const { collectionReady } = await this.ensureVectorStoreAvailability();
      console.log("[ChatAssistant Debug] Vector store check result:", {
        reachable: this.vectorStoreReachable,
        collectionReady,
      });

      this.maybeStartBackgroundIndex(collectionReady);
    } catch (error) {
      this.logVectorStoreInitialiseError(error);
    }
  }

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

  shouldHandle(input: unknown): boolean {
    const contentValue =
      input && typeof (input as { content?: unknown }).content === "string"
        ? (input as { content?: string }).content
        : null;
    const content = typeof input === "string" ? input : contentValue || "";
    return Boolean(content && this.mentionRegex.test(content));
  }

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

  createResponseFromContent(
    content: string,
    options: ChatAssistantResponseOptions = {},
  ): Promise<ChatAssistantResponse | null> {
    return createChatAssistantResponse(this, content, options);
  }

  extractQuestion(content = ""): string | null {
    const match = content ? this.mentionRegex.exec(content) : null;
    if (!match) {
      return null;
    }

    const after = content.slice(match.index + match[0].length);
    const cleaned = after.replace(/^[\s,:-]+/, "").trim();
    return cleaned || null;
  }

  buildIndex(): Promise<void> {
    return buildChatAssistantIndex(this);
  }

  ensureVectorStoreAvailability(
    options: {
      throwOnUnavailable?: boolean;
    } = {},
  ): Promise<{
    reachable: boolean;
    collectionReady: boolean;
    error?: Error;
  }> {
    return ensureChatAssistantVectorStoreAvailability(this, options);
  }

  private maybeStartBackgroundIndex(collectionReady: boolean): void {
    if (!collectionReady && this.autoIndex && this.vectorStoreReachable) {
      console.log(
        "[ChatAssistant Debug] 🔄 Auto-indexing enabled and collection missing - starting background index build...",
      );
      this.indexPromise = this.buildIndex()
        .then(() => {
          console.log("[ChatAssistant] ✅ Auto-index completed successfully");
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
      return;
    }

    if (!collectionReady && !this.autoIndex && this.vectorStoreReachable) {
      console.warn(
        "[ChatAssistant] ⚠️  Collection not found and auto-indexing is disabled.",
      );
      console.warn("[ChatAssistant] To create the collection, either:");
      console.warn(
        "[ChatAssistant]   1. Run: bun run build && bun dist/scripts/index-mcp-chat.js",
      );
      console.warn(
        "[ChatAssistant]   2. Set CHAT_ASSISTANT_AUTO_INDEX=true and restart",
      );
    }
  }

  private logVectorStoreInitialiseError(error: unknown): void {
    if (
      (error as ErrorWithCode)?.code ===
      MCP_ERROR_CODES.VECTOR_STORE_UNAVAILABLE
    ) {
      console.warn(
        `[ChatAssistant] Vector store unreachable (${(error as Error).message}). @Chat will respond with setup guidance until the index becomes available.`,
      );
      return;
    }

    console.warn(
      `[ChatAssistant] Unable to verify vector store availability: ${(error as Error).message}`,
    );
  }
}

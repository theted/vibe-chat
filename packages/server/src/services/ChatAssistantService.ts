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
  checkChatAssistantIndex,
} from "./chatAssistantVectorStore.js";

const DEFAULT_TIMEOUT_MS = 15_000;
const CHAT_HISTORY_LIMIT = 5;

/**
 * Handles @Chat requests: a Claude agent with code search over the Chroma
 * index, web search and a browse tool (see @ai-chat/mcp-assistant).
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
  indexCheckPromise: Promise<void> | null;
  vectorStoreReachable: boolean | null;
  collectionReady: boolean | null;

  constructor(options: ChatAssistantOptions = {}) {
    const {
      mentionName = "Chat",
      projectRoot,
      timeoutMs = DEFAULT_TIMEOUT_MS,
    } = options;
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
    this.chatHistoryLimit = CHAT_HISTORY_LIMIT;
    this.server = null;
    this.indexPromise = null;
    this.indexCheckPromise = null;
    this.vectorStoreReachable = null;
    this.collectionReady = null;
  }

  async initialise(): Promise<void> {
    if (this.configUnresolved) {
      throw new Error(
        "Unable to locate project root. Set CHAT_ASSISTANT_ROOT or provide projectRoot explicitly.",
      );
    }

    this.server = createLocalCodeMcpServer({
      rootDir: this.projectRoot,
      chromaUrl: this.chromaUrl,
      collectionName: this.collectionName,
    });

    console.info("[ChatAssistant] Initialised:", {
      projectRoot: this.projectRoot,
      chromaUrl: this.chromaUrl,
      collectionName: this.collectionName,
      model: this.server.model,
      autoIndex: this.autoIndex,
    });

    await this.refreshIndex();
  }

  /**
   * Checks the index and starts a rebuild if it's missing or stale. Never
   * throws: the agent can still answer web questions without the index.
   * Also called lazily per question, so @Chat recovers when Chroma came up
   * after the server did.
   */
  refreshIndex(): Promise<void> {
    this.indexCheckPromise ??= this.checkIndex().finally(() => {
      this.indexCheckPromise = null;
    });
    return this.indexCheckPromise;
  }

  private async checkIndex(): Promise<void> {
    if (this.indexPromise) return;
    try {
      const freshness = await checkChatAssistantIndex(this);
      console.info(`[ChatAssistant] Code index is ${freshness}.`);
      if (freshness !== "current") {
        this.maybeStartBackgroundIndex(freshness);
      }
    } catch (error) {
      this.logIndexCheckError(error);
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
    // Not initialised (e.g. a missing API key): let the other AIs answer
    // instead of swallowing the mention
    if (!this.server) return false;
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

  /**
   * The whole message minus the @Chat token. AIs often put the mention at
   * the end ("...how does routing work, @Chat?"), so "text after the
   * mention" would lose the question.
   */
  extractQuestion(content = ""): string | null {
    if (!content || !this.mentionRegex.test(content)) {
      return null;
    }

    // Takes the comma/colon that usually follows the mention with it
    const globalMention = new RegExp(`${this.mentionRegex.source}[,:]?`, "gi");
    const cleaned = content
      .replace(globalMention, "")
      .replace(/\s+([,.?!;])/g, "$1") // "work ?" -> "work?"
      .replace(/,([.?!])/g, "$1") // "work,?" -> "work?"
      .replace(/^[\s,:;-]+|[\s,:;-]+$/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    return cleaned || null;
  }

  buildIndex(): Promise<void> {
    return buildChatAssistantIndex(this);
  }

  private maybeStartBackgroundIndex(freshness: "missing" | "stale"): void {
    if (!this.autoIndex) {
      console.warn(
        `[ChatAssistant] Code index is ${freshness} and CHAT_ASSISTANT_AUTO_INDEX is off. Rebuild it with 'bun run chat:index', or set CHAT_ASSISTANT_AUTO_INDEX=true.`,
      );
      return;
    }

    console.info(
      `[ChatAssistant] Rebuilding ${freshness} code index in the background...`,
    );
    this.indexPromise = this.buildIndex()
      .catch((error: unknown) => {
        console.error("[ChatAssistant] Background index build failed:", error);
      })
      .finally(() => {
        this.indexPromise = null;
      });
  }

  private logIndexCheckError(error: unknown): void {
    if (
      (error as ErrorWithCode)?.code ===
      MCP_ERROR_CODES.VECTOR_STORE_UNAVAILABLE
    ) {
      console.warn(
        `[ChatAssistant] Vector store unreachable (${(error as Error).message}). @Chat will answer without code search until Chroma is back.`,
      );
      return;
    }

    console.warn("[ChatAssistant] Unable to check the code index:", error);
  }
}

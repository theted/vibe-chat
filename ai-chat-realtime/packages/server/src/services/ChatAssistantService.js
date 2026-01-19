import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  createLocalCodeMcpServer,
  MCP_ERROR_CODES,
} from "@ai-chat/mcp-assistant";
import { createWorkspaceIndexer } from "@ai-chat/mcp-assistant/indexer";

const normalizeAlias = (value) =>
  value
    ? value
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
    : "";

const withTimeout = async (promise, timeoutMs, createTimeoutError) => {
  if (!timeoutMs || Number.isNaN(timeoutMs) || timeoutMs <= 0) {
    return Promise.resolve(promise);
  }

  let timeoutId = null;

  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          const error =
            typeof createTimeoutError === "function"
              ? createTimeoutError()
              : new Error(
                  typeof createTimeoutError === "string"
                    ? createTimeoutError
                    : `Operation timed out after ${timeoutMs}ms`
                );
          reject(error);
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const findWorkspaceRoot = (startDir) => {
  if (!startDir) {
    return null;
  }

  let current = path.resolve(startDir);
  const visited = new Set();

  while (!visited.has(current)) {
    visited.add(current);
    const candidates = [
      path.join(current, "scripts", "run-mcp-chat.ts"),
      path.join(current, "scripts", "index-mcp-chat.ts"),
      path.join(current, "dist", "scripts", "run-mcp-chat.js"),
      path.join(current, "dist", "scripts", "index-mcp-chat.js"),
    ];
    const hasScripts = candidates.every((candidate) => existsSync(candidate));
    if (hasScripts) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  return null;
};

const resolveWorkspaceRoot = (options = {}) => {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const envRoot = process.env.CHAT_ASSISTANT_ROOT;

  const explicitRoot =
    options.projectRoot || (envRoot ? envRoot.trim() : null);

  const resolvedProject =
    (explicitRoot && path.resolve(explicitRoot)) ||
    findWorkspaceRoot(moduleDir) ||
    findWorkspaceRoot(process.cwd());

  if (!resolvedProject) {
    return { projectRoot: moduleDir, unresolved: true };
  }

  return { projectRoot: resolvedProject, unresolved: false };
};

const formatGitHubUrl = (relativePath, startLine = null, endLine = null) => {
  const baseUrl = "https://github.com/theted/vibe-chat/blob/master";
  const lineFragment =
    startLine && endLine
      ? `#L${startLine}-L${endLine}`
      : startLine
      ? `#L${startLine}`
      : "";
  return `${baseUrl}/${relativePath}${lineFragment}`;
};

const enhanceAnswerWithLinks = (answer, contexts, projectRoot) => {
  if (!answer || !contexts || contexts.length === 0) {
    return answer;
  }

  let enhanced = answer;

  // Add source references section if contexts exist
  const sourceRefs = contexts
    .map((ctx) => {
      const fullPath = path.join(projectRoot, ctx.relativePath);
      const lineInfo =
        ctx.startLine && ctx.endLine
          ? `:${ctx.startLine}-${ctx.endLine}`
          : "";
      const githubUrl = formatGitHubUrl(
        ctx.relativePath,
        ctx.startLine,
        ctx.endLine
      );
      return `- [\`${ctx.relativePath}${lineInfo}\`](${githubUrl})`;
    })
    .join("\n");

  // Append sources section if not already present
  if (!enhanced.includes("**Sources:**") && !enhanced.includes("**References:**")) {
    enhanced += `\n\n**Sources:**\n${sourceRefs}`;
  }

  return enhanced;
};

export class ChatAssistantService {
  constructor(options = {}) {
    const {
      mentionName = "Chat",
      projectRoot,
      timeoutMs = 15_000,
    } = options;

    const resolved = resolveWorkspaceRoot({ projectRoot });

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

  async initialise() {
    if (this.configUnresolved) {
      throw new Error(
        "Unable to locate project root. Set CHAT_ASSISTANT_ROOT or provide projectRoot explicitly."
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
    });

    try {
      console.log(`[ChatAssistant Debug] Checking vector store availability...`);
      const { collectionReady } = await this.ensureVectorStoreAvailability();
      console.log(`[ChatAssistant Debug] Vector store check result:`, {
        reachable: this.vectorStoreReachable,
        collectionReady,
      });

      if (!collectionReady && this.autoIndex && this.vectorStoreReachable) {
        console.log(`[ChatAssistant Debug] 🔄 Auto-indexing enabled and collection missing - starting background index build...`);
        this.indexPromise = this.buildIndex()
          .then(() => {
            console.log(`[ChatAssistant] ✅ Auto-index completed successfully`);
          })
          .catch((error) => {
            console.error(
              `[ChatAssistant] ❌ Auto-index failed: ${error.message}`
            );
            return null;
          })
          .finally(() => {
            this.indexPromise = null;
          });
      } else if (!collectionReady && !this.autoIndex && this.vectorStoreReachable) {
        console.warn(`[ChatAssistant] ⚠️  Collection not found and auto-indexing is disabled.`);
        console.warn(`[ChatAssistant] To create the collection, either:`);
        console.warn(
          `[ChatAssistant]   1. Run: npm run build && node dist/scripts/index-mcp-chat.js`
        );
        console.warn(`[ChatAssistant]   2. Set CHAT_ASSISTANT_AUTO_INDEX=true and restart`);
      }
    } catch (error) {
      if (error?.code === MCP_ERROR_CODES.VECTOR_STORE_UNAVAILABLE) {
        console.warn(
          `[ChatAssistant] Vector store unreachable (${error.message}). @Chat will respond with setup guidance until the index becomes available.`
        );
      } else {
        console.warn(
          `[ChatAssistant] Unable to verify vector store availability: ${error.message}`
        );
      }
    }
  }

  getMetadata() {
    return {
      sender: this.displayName,
      displayName: this.displayName,
      alias: this.alias,
      normalizedAlias: this.normalizedAlias,
      aiId: "internal_chat_assistant",
      aiName: this.displayName,
    };
  }

  shouldHandle(input) {
    const content =
      typeof input === "string"
        ? input
        : input && typeof input.content === "string"
        ? input.content
        : "";
    return Boolean(content && this.mentionRegex.test(content));
  }

  prepareChatHistory(chatHistory = []) {
    if (!Array.isArray(chatHistory) || chatHistory.length === 0) {
      return [];
    }

    return chatHistory
      .filter(
        (message) =>
          message && typeof message.content === "string" && message.content.trim()
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

  async createResponseFromContent(content, options = {}) {
    const { emitter = null, roomId = null, chatHistory = [] } = options;
    const emitTyping = (event, payload) => {
      if (!emitter) return;
      const target = roomId ? emitter.to(roomId) : emitter;
      target.emit(event, { roomId, ...payload });
    };

    const question = this.extractQuestion(content);
    if (!question) {
      return null;
    }

    console.info(`[ChatAssistant] Generating answer for question: "${question}"`);

    const historyContext = this.prepareChatHistory(chatHistory);

    try {
      if (!this.server) {
        throw new Error("assistant not initialised");
      }

      if (this.indexPromise) {
        try {
          await this.indexPromise;
        } catch (error) {
          console.warn(
            `[ChatAssistant] Background indexing failed: ${error.message}`
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
            `Check that the Chroma service is running at ${this.chromaUrl} and try re-indexing with \`npm run build && node dist/scripts/index-mcp-chat.js\`.`,
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
          .catch((error) => {
            console.warn(
              `[ChatAssistant] Auto-index failed: ${error.message}`
            );
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
          console.warn(
            `[ChatAssistant] Failed to rebuild vector index: ${error.message}`
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
        answer: enhanceAnswerWithLinks(answer, contexts, this.projectRoot),
        contexts,
        error: result.error || null,
      };
    } catch (error) {
      emitTyping("ai-generating-stop", {
        aiId: "internal_chat_assistant",
      });
      return {
        question,
        answer: `I tried to look up "${question}" but ran into an issue (${error.message}).`,
        error,
      };
    }
  }

  extractQuestion(content = "") {
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

  async buildIndex() {
    await this.ensureVectorStoreAvailability({ throwOnUnavailable: true });

    const indexer = createWorkspaceIndexer({
      rootDir: this.projectRoot,
      chromaUrl: this.chromaUrl,
      collectionName: this.collectionName,
    });

    const result = await indexer.buildEmbeddingStore();
    console.info(
      `[ChatAssistant] Indexed ${result.chunks} chunks into "${result.collectionName}" at ${result.chromaUrl}`
    );

    await this.server.ensureCollection();
    this.vectorStoreReachable = true;
    this.collectionReady = true;
    this.vectorStoreError = null;
  }

  async ensureVectorStoreAvailability(options = {}) {
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

    console.log(`[ChatAssistant Debug] Checking vector store availability at ${this.chromaUrl} (timeout: ${this.timeoutMs}ms)`);

    try {
      const timeoutMs = Number.isFinite(this.timeoutMs)
        ? Math.max(0, Number(this.timeoutMs))
        : 0;

      const exists = await withTimeout(
        this.server.ensureCollection(),
        timeoutMs,
        () => {
          const error = new Error(
            `Timed out after ${timeoutMs}ms while contacting the Chroma vector store at ${this.chromaUrl}.`
          );
          error.code = MCP_ERROR_CODES.VECTOR_STORE_UNAVAILABLE;
          return error;
        }
      );
      console.log(`[ChatAssistant Debug] ✅ Vector store reachable, collection exists: ${exists}`);
      this.vectorStoreReachable = true;
      this.collectionReady = Boolean(exists);
      this.vectorStoreError = null;
      return {
        reachable: true,
        collectionReady: this.collectionReady,
      };
    } catch (error) {
      console.error(`[ChatAssistant Debug] ❌ Vector store check failed:`, {
        errorMessage: error.message,
        errorCode: error.code,
        chromaUrl: this.chromaUrl,
      });

      if (error?.code === MCP_ERROR_CODES.VECTOR_STORE_UNAVAILABLE) {
        this.vectorStoreReachable = false;
        this.collectionReady = false;
        this.vectorStoreError = error;
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

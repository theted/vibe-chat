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
    const runPath = path.join(current, "scripts", "run-mcp-chat.js");
    const indexPath = path.join(current, "scripts", "index-mcp-chat.js");
    if (existsSync(runPath) && existsSync(indexPath)) {
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

    this.server = createLocalCodeMcpServer({
      rootDir: this.projectRoot,
      chromaUrl: this.chromaUrl,
      collectionName: this.collectionName,
      openAiApiKey: process.env.OPENAI_API_KEY,
    });

    try {
      const { collectionReady } = await this.ensureVectorStoreAvailability();

      if (!collectionReady && this.autoIndex && this.vectorStoreReachable) {
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

  async createResponseFromContent(content, options = {}) {
    const { emitter = null, roomId = null } = options;
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
            `Check that the Chroma service is running at ${this.chromaUrl} and try re-indexing with \`node scripts/index-mcp-chat.js\`.`,
          ].join(" "),
        };
      }

      let result = await this.server.answerQuestion(question);

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
            result = await this.server.answerQuestion(question);
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

      return {
        question,
        answer:
          result.answer ||
          `I looked for "${question}" but did not find any relevant code snippets.`,
        contexts: result.contexts || [],
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
      this.vectorStoreReachable = true;
      this.collectionReady = Boolean(exists);
      this.vectorStoreError = null;
      return {
        reachable: true,
        collectionReady: this.collectionReady,
      };
    } catch (error) {
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

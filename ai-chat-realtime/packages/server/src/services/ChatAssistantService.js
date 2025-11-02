import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  createLocalCodeMcpServer,
} from "@ai-chat/mcp-assistant";
import { createWorkspaceIndexer } from "@ai-chat/mcp-assistant/indexer";

const normalizeAlias = (value) =>
  value
    ? value
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
    : "";

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

const resolveDefaultConfig = (options = {}) => {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const envScript = process.env.CHAT_ASSISTANT_SCRIPT;
  const envRoot = process.env.CHAT_ASSISTANT_ROOT;

  const explicitScript =
    options.scriptPath ||
    (envScript ? envScript.trim() : null);

  const explicitRoot =
    options.projectRoot ||
    (envRoot ? envRoot.trim() : null);

  const resolvedProject =
    (explicitRoot && path.resolve(explicitRoot)) ||
    findWorkspaceRoot(moduleDir) ||
    findWorkspaceRoot(process.cwd());

  if (!resolvedProject) {
    return {
      projectRoot: moduleDir,
      scriptPath: options.scriptPath
        ? path.isAbsolute(options.scriptPath)
          ? options.scriptPath
          : path.resolve(moduleDir, options.scriptPath)
        : path.join(moduleDir, "../../../scripts/run-mcp-chat.js"),
      unresolved: true,
    };
  }

  const scriptPath = explicitScript
    ? path.isAbsolute(explicitScript)
      ? explicitScript
      : path.resolve(resolvedProject, explicitScript)
    : path.join(resolvedProject, "scripts", "run-mcp-chat.js");

  return { projectRoot: resolvedProject, scriptPath, unresolved: false };
};

export class ChatAssistantService {
  constructor(options = {}) {
    const {
      mentionName = "Chat",
      scriptPath,
      projectRoot,
      timeoutMs = 15_000,
    } = options;

    const resolved = resolveDefaultConfig({ scriptPath, projectRoot });

    this.name = mentionName;
    this.displayName = `@${mentionName}`;
    this.alias = mentionName.toLowerCase();
    this.normalizedAlias = normalizeAlias(this.alias);
    this.projectRoot = resolved.projectRoot;
    this.timeoutMs = timeoutMs;
    this.mentionRegex = new RegExp(`@${mentionName}\\b`, "i");
    this.configUnresolved = resolved.unresolved;
    this.scriptPath = resolved.scriptPath;
    this.embeddingStorePath = process.env.CHAT_ASSISTANT_EMBEDDINGS_PATH
      ? path.resolve(process.env.CHAT_ASSISTANT_EMBEDDINGS_PATH)
      : undefined;
    this.autoIndex =
      String(process.env.CHAT_ASSISTANT_AUTO_INDEX || "").toLowerCase() ===
      "true";
    this.server = null;
    this.indexPromise = null;
  }

  async initialise() {
    if (this.configUnresolved) {
      throw new Error(
        "Unable to locate MCP scripts directory automatically. Set CHAT_ASSISTANT_SCRIPT or CHAT_ASSISTANT_ROOT environment variables to point at the repository scripts."
      );
    }

    this.server = createLocalCodeMcpServer({
      rootDir: this.projectRoot,
      embeddingStorePath: this.embeddingStorePath,
      openAiApiKey: process.env.OPENAI_API_KEY,
    });

    try {
      await this.server.ensureEmbeddingStore();
      console.info(
        `[ChatAssistant] Initialised RAG store at ${path.relative(
          this.projectRoot,
          this.server.embeddingStorePath
        )}`
      );
    } catch (error) {
      console.warn(
        `[ChatAssistant] Unable to load embedding store: ${error.message}`
      );
      if (this.autoIndex && !this.indexPromise) {
        this.indexPromise = this.buildEmbeddings()
          .catch((indexError) => {
            console.warn(
              `[ChatAssistant] Auto-index failed: ${indexError.message}`
            );
            return null;
          })
          .finally(() => {
            this.indexPromise = null;
          });
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

      if (!this.server.hasEmbeddingStore()) {
        await this.ensureEmbeddings();
      }

      emitTyping("ai-generating-start", {
        aiId: "internal_chat_assistant",
        displayName: this.displayName,
        alias: this.alias,
      });

      const { answer } = await this.server.answerQuestion(question);

      emitTyping("ai-generating-stop", {
        aiId: "internal_chat_assistant",
      });

      return {
        question,
        answer:
          answer ||
          `I looked for "${question}" but did not find any relevant code snippets.`,
        error: null,
      };
    } catch (error) {
      emitTyping("ai-generating-stop", {
        aiId: "internal_chat_assistant",
      });
      const failure = {
        question,
        answer: `I tried to look up "${question}" but ran into an issue (${error.message}).`,
        error,
      };
      return failure;
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

  async ensureEmbeddings() {
    if (this.server?.hasEmbeddingStore()) {
      return;
    }
    if (this.indexPromise) {
      try {
        await this.indexPromise;
      } catch {
        // ignore here; failure handled below
      }
      if (this.server?.hasEmbeddingStore()) {
        return;
      }
    }

    if (this.autoIndex && !this.indexPromise) {
      this.indexPromise = this.buildEmbeddings()
        .catch((error) => {
          console.warn(`[ChatAssistant] Auto-index failed: ${error.message}`);
          return null;
        })
        .finally(() => {
          this.indexPromise = null;
        });

      try {
        await this.indexPromise;
      } catch {
        // handled below
      }

      if (this.server?.hasEmbeddingStore()) {
        return;
      }
    }

    throw new Error(
      "Embedding store missing. Run node scripts/index-mcp-chat.js to build it."
    );
  }

  async buildEmbeddings() {
    try {
      console.info("[ChatAssistant] Building embedding store on-demand...");
      const indexer = createWorkspaceIndexer({
        rootDir: this.projectRoot,
        embeddingStorePath: this.embeddingStorePath,
      });
      const result = await indexer.buildEmbeddingStore();
      console.info(
        `[ChatAssistant] Indexed ${result.chunks} chunks -> ${path.relative(
          this.projectRoot,
          result.storePath
        )}`
      );
      await this.server.ensureEmbeddingStore();
    } catch (error) {
      throw error;
    }
  }
}

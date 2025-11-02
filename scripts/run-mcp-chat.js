#!/usr/bin/env node

import path from "path";
import process from "process";
import { fileURLToPath } from "url";
import {
  createLocalCodeMcpServer,
  MCP_ERROR_CODES,
} from "../ai-chat-realtime/packages/mcp-assistant/src/index.js";

const parseArgs = () => {
  const args = process.argv.slice(2);
  const result = { question: "", raw: false };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--question" && typeof args[i + 1] === "string") {
      result.question = args[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--raw") {
      result.raw = true;
      continue;
    }
    if (!result.question) {
      result.question = arg;
    }
  }

  return result;
};

const tryLoadDotenv = async (projectRoot) => {
  try {
    const dotenv = await import("dotenv");
    dotenv.config({ path: path.join(projectRoot, ".env") });
  } catch (error) {
    if (error.code !== "ERR_MODULE_NOT_FOUND") {
      console.warn(
        `run-mcp-chat: Failed to load dotenv (${error.message}). Continuing with process env.`
      );
    }
  }
};

const main = async () => {
  const { question, raw } = parseArgs();
  if (!question || !question.trim()) {
    console.error(
      "run-mcp-chat: A question is required. Pass it via '--question \"...\"'."
    );
    process.exit(1);
  }

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(scriptDir, "..");
  await tryLoadDotenv(projectRoot);

  const server = createLocalCodeMcpServer({
    rootDir: projectRoot,
  });

  try {
    await server.ensureEmbeddingStore();
  } catch (error) {
    if (error?.code === MCP_ERROR_CODES.VECTOR_STORE_UNAVAILABLE) {
      console.error(
        `MCP embedding lookup failed: could not reach Chroma at ${process.env.CHROMA_URL || "http://localhost:8000"}. ${error.message}`
      );
    } else {
      console.error(
        `MCP embedding store missing or unreadable. Run 'node scripts/index-mcp-chat.js' first. (${error.message})`
      );
    }
    process.exit(1);
  }

  try {
    const result = await server.answerQuestion(question);
    if (!result?.answer) {
      console.log(
        `I could not locate indexed code related to "${question.trim()}".`
      );
      return;
    }

    console.log(result.answer);

    if (raw && result.contexts?.length) {
      const refs = result.contexts
        .map(
          (ctx) =>
            `[${ctx.id}] ${ctx.relativePath}:${ctx.startLine}-${ctx.endLine} (score=${ctx.score.toFixed(
              3
            )})`
        )
        .join("\n");
      console.log(`\nContexts:\n${refs}`);
    }
  } catch (error) {
    console.error(`run-mcp-chat failed: ${error.message}`);
    process.exit(1);
  }
};

main().catch((error) => {
  console.error(`run-mcp-chat failed: ${error.message}`);
  process.exit(1);
});

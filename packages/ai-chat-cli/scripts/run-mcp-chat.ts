#!/usr/bin/env bun

import path from "path";
import process from "process";
import { fileURLToPath } from "url";
import {
  createLocalCodeMcpServer,
  MCP_ERROR_CODES,
} from "@ai-chat/mcp-assistant";

type RunArgs = {
  question: string;
  raw: boolean;
};

const parseArgs = (): RunArgs => {
  const args = process.argv.slice(2);
  const result: RunArgs = { question: "", raw: false };

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

const tryLoadDotenv = async (projectRoot: string): Promise<void> => {
  try {
    const dotenv = await import("dotenv");
    dotenv.config({ path: path.join(projectRoot, ".env") });
  } catch (error: any) {
    if (error?.code !== "ERR_MODULE_NOT_FOUND") {
      console.warn(
        `run-mcp-chat: Failed to load dotenv (${error?.message || error}). Continuing with process env.`,
      );
    }
  }
};

const main = async (): Promise<void> => {
  const { question, raw } = parseArgs();
  if (!question || !question.trim()) {
    console.error(
      "run-mcp-chat: A question is required. Pass it via '--question \"...\"'.",
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
  } catch (error: any) {
    if (error?.code === MCP_ERROR_CODES.VECTOR_STORE_UNAVAILABLE) {
      console.error(
        `MCP embedding lookup failed: could not reach Chroma at ${
          process.env.CHROMA_URL || "http://localhost:8000"
        }. ${error?.message || error}`,
      );
    } else {
      console.error(
        `MCP embedding store missing or unreadable. Run 'npm run build && bun dist/scripts/index-mcp-chat.js' first. (${error?.message || error})`,
      );
    }
    process.exit(1);
  }

  try {
    const result = await server.answerQuestion(question);
    if (!result?.answer) {
      console.log(
        `I could not locate indexed code related to "${question.trim()}".`,
      );
      return;
    }

    console.log(result.answer);

    if (raw && result.contexts?.length) {
      const refs = result.contexts
        .map(
          (ctx) =>
            `[${ctx.id}] ${ctx.relativePath}:${ctx.startLine}-${
              ctx.endLine
            } (score=${ctx.score.toFixed(3)})`,
        )
        .join("\n");
      console.log(`\nContexts:\n${refs}`);
    }
  } catch (error: any) {
    console.error(`run-mcp-chat failed: ${error?.message || error}`);
    process.exit(1);
  }
};

main().catch((error: any) => {
  console.error(`run-mcp-chat failed: ${error?.message || error}`);
  process.exit(1);
});

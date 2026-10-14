#!/usr/bin/env bun

import path from "path";
import process from "process";
import { fileURLToPath } from "url";
import {
  createLocalCodeMcpServer,
  MCP_ERROR_CODES,
  DEFAULT_CHROMA_URL,
  findWorkspaceRoot,
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

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const getErrorCode = (error: unknown): unknown =>
  (error as { code?: unknown } | null)?.code;

const tryLoadDotenv = async (projectRoot: string): Promise<void> => {
  try {
    const dotenv = await import("dotenv");
    dotenv.config({ path: path.join(projectRoot, ".env") });
  } catch (error) {
    if (getErrorCode(error) !== "ERR_MODULE_NOT_FOUND") {
      console.warn(
        `run-mcp-chat: Failed to load dotenv (${getErrorMessage(error)}). Continuing with process env.`,
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
  const projectRoot = findWorkspaceRoot(scriptDir) ?? process.cwd();
  await tryLoadDotenv(projectRoot);

  const server = createLocalCodeMcpServer({
    rootDir: projectRoot,
  });

  try {
    await server.ensureEmbeddingStore();
  } catch (error) {
    if (getErrorCode(error) === MCP_ERROR_CODES.VECTOR_STORE_UNAVAILABLE) {
      console.error(
        `MCP embedding lookup failed: could not reach Chroma at ${
          process.env.CHROMA_URL || DEFAULT_CHROMA_URL
        }. ${getErrorMessage(error)}`,
      );
    } else {
      console.error(
        `MCP embedding store missing or unreadable. Run 'bun run chat:index' first. (${getErrorMessage(error)})`,
      );
    }
    process.exit(1);
  }

  try {
    const result = await server.answerQuestion(question);
    if (!result?.answer) {
      console.log(
        `I couldn't put an answer together for "${question.trim()}".`,
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
            } (distance=${ctx.score?.toFixed(3) ?? "n/a"})`,
        )
        .join("\n");
      console.log(`\nContexts:\n${refs}`);
    }
  } catch (error) {
    console.error(`run-mcp-chat failed: ${getErrorMessage(error)}`);
    process.exit(1);
  }
};

main().catch((error: unknown) => {
  console.error(`run-mcp-chat failed: ${getErrorMessage(error)}`);
  process.exit(1);
});

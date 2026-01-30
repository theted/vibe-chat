#!/usr/bin/env node

import path from "path";
import process from "process";
import { fileURLToPath } from "url";
import {
  createWorkspaceIndexer,
} from "@ai-chat/mcp-assistant/indexer";
import {
  MCP_ERROR_CODES,
} from "@ai-chat/mcp-assistant";

const DEFAULT_COLLECTION_NAME =
  process.env.CHAT_ASSISTANT_COLLECTION || "ai-chat-workspace";
const DEFAULT_CHROMA_URL =
  process.env.CHROMA_URL || "http://localhost:8000";

type IndexArgs = {
  chunkSize?: number;
  chunkOverlap?: number;
  chromaUrl?: string;
  collectionName?: string;
  projectRoot?: string;
  skipDelete: boolean;
};

const parseArgs = (): IndexArgs => {
  const args = process.argv.slice(2);
  const result: IndexArgs = {
    chunkSize: undefined,
    chunkOverlap: undefined,
    chromaUrl: undefined,
    collectionName: undefined,
    projectRoot: undefined,
    skipDelete: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--chunk-size" && args[i + 1]) {
      result.chunkSize = parseInt(args[i + 1], 10);
      i += 1;
      continue;
    }
    if (arg === "--chunk-overlap" && args[i + 1]) {
      result.chunkOverlap = parseInt(args[i + 1], 10);
      i += 1;
      continue;
    }
    if (arg === "--chroma-url" && args[i + 1]) {
      result.chromaUrl = args[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--collection" && args[i + 1]) {
      result.collectionName = args[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--project-root" && args[i + 1]) {
      result.projectRoot = path.resolve(args[i + 1]);
      i += 1;
      continue;
    }
    if (arg === "--no-delete" || arg === "--skip-delete") {
      result.skipDelete = true;
      continue;
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
        `index-mcp-chat: Failed to load dotenv (${error?.message || error}). Continuing with process env.`
      );
    }
  }
};

const main = async (): Promise<void> => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const defaultProjectRoot = path.resolve(scriptDir, "..");

  const args = parseArgs();
  const projectRoot =
    args.projectRoot ||
    process.env.CHAT_ASSISTANT_ROOT ||
    defaultProjectRoot;

  await tryLoadDotenv(projectRoot);

  if (!process.env.OPENAI_API_KEY) {
    console.error(
      "OPENAI_API_KEY is required to index the MCP workspace. Add it to your environment or .env file."
    );
    process.exit(1);
  }

  const chromaUrl = args.chromaUrl || process.env.CHROMA_URL || DEFAULT_CHROMA_URL;
  const collectionName =
    args.collectionName ||
    process.env.CHAT_ASSISTANT_COLLECTION ||
    DEFAULT_COLLECTION_NAME;

  process.env.CHROMA_URL = chromaUrl;
  process.env.CHAT_ASSISTANT_COLLECTION = collectionName;

  const indexer = createWorkspaceIndexer({
    rootDir: projectRoot,
    chunkSize: args.chunkSize,
    chunkOverlap: args.chunkOverlap,
    chromaUrl,
    collectionName,
    skipDelete: args.skipDelete,
  });

  console.log("🔍 Building MCP embedding store...");
  try {
    const result = await indexer.buildEmbeddingStore();
    console.log(
      `✅ Indexed ${result.chunks} chunks into collection "${result.collectionName}" at ${result.chromaUrl}`
    );
  } catch (error: any) {
    if (error?.code === MCP_ERROR_CODES.VECTOR_STORE_UNAVAILABLE) {
      console.error(
        `index-mcp-chat: Unable to reach Chroma at ${chromaUrl}. Start the vector store (e.g. 'docker compose up chroma') or set CHROMA_URL before retrying.`
      );
    } else {
      console.error(`index-mcp-chat failed: ${error?.message || error}`);
    }
    process.exit(1);
  }
};

main().catch((error: any) => {
  console.error(`index-mcp-chat failed: ${error?.message || error}`);
  process.exit(1);
});

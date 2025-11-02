#!/usr/bin/env node

import path from "path";
import process from "process";
import { fileURLToPath } from "url";
import { createWorkspaceIndexer } from "../ai-chat-realtime/packages/mcp-assistant/src/indexer.js";

const parseArgs = () => {
  const args = process.argv.slice(2);
  const result = {
    chunkSize: undefined,
    chunkOverlap: undefined,
    batchSize: undefined,
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
    if (arg === "--batch-size" && args[i + 1]) {
      result.batchSize = parseInt(args[i + 1], 10);
      i += 1;
      continue;
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
        `index-mcp-chat: Failed to load dotenv (${error.message}). Continuing with process env.`
      );
    }
  }
};

const main = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(scriptDir, "..");
  await tryLoadDotenv(projectRoot);

  if (!process.env.OPENAI_API_KEY) {
    console.error(
      "OPENAI_API_KEY is required to index the MCP workspace. Add it to your environment or .env file."
    );
    process.exit(1);
  }

  const args = parseArgs();
  const indexer = createWorkspaceIndexer({
    rootDir: projectRoot,
    chunkSize: args.chunkSize,
    chunkOverlap: args.chunkOverlap,
    batchSize: args.batchSize,
  });

  console.log("🔍 Building MCP embedding store...");
  const result = await indexer.buildEmbeddingStore();
  console.log(
    `✅ Indexed ${result.chunks} chunks. Saved to ${path.relative(
      projectRoot,
      result.storePath
    )}`
  );
};

main().catch((error) => {
  console.error(`index-mcp-chat failed: ${error.message}`);
  process.exit(1);
});

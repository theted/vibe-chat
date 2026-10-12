/**
 * stdio entry point for the codebase MCP server. Claude Code starts it from
 * the repo's .mcp.json; `bun run chat:mcp` runs it by hand, e.g. under
 * `npx @modelcontextprotocol/inspector`.
 */
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { CodebaseSearch } from "../codeSearch.js";
import { DEFAULT_CHROMA_URL, DEFAULT_COLLECTION_NAME } from "../constants.js";
import { createEmbedder } from "../embeddings.js";
import { createWorkspaceIndexer } from "../indexer.js";
import { findWorkspaceRoot } from "../workspaceRoot.js";
import { createCodebaseMcpServer, MCP_SERVER_NAME } from "./codebaseServer.js";

// stdout is the JSON-RPC channel: one stray console.log from our code or a
// dependency corrupts the stream and the client drops the connection.
// stderr is free, and Claude Code keeps it in the server's MCP log.
console.log = console.info = console.debug = console.error;

const main = async (): Promise<void> => {
  const workspaceRoot = findWorkspaceRoot(
    path.dirname(fileURLToPath(import.meta.url)),
  );
  if (!workspaceRoot) {
    throw new Error("Could not locate the vibe-chat workspace root.");
  }

  // Bun only autoloads .env from the working directory, and Claude Code
  // doesn't promise one. Variables already set (e.g. from .mcp.json) win.
  const envFile = path.join(workspaceRoot, ".env");
  if (existsSync(envFile)) {
    process.loadEnvFile(envFile);
  }

  const chromaUrl = process.env.CHROMA_URL || DEFAULT_CHROMA_URL;
  const collectionName =
    process.env.CHAT_ASSISTANT_COLLECTION || DEFAULT_COLLECTION_NAME;
  const embedder = createEmbedder();
  const codebase = new CodebaseSearch({ chromaUrl, collectionName, embedder });
  const indexer = createWorkspaceIndexer({
    rootDir: workspaceRoot,
    chromaUrl,
    collectionName,
    embedder,
  });

  const server = createCodebaseMcpServer({
    search: (query, limit) => codebase.search(query, limit),
    checkFreshness: () => indexer.checkFreshness(),
  });
  await server.connect(new StdioServerTransport());
  console.error(
    `[MCP] ${MCP_SERVER_NAME} ready: "${collectionName}" at ${chromaUrl}, ${embedder.id} embeddings, root ${workspaceRoot}`,
  );
};

main().catch((error) => {
  console.error(`[MCP] ${MCP_SERVER_NAME} failed to start:`, error);
  process.exit(1);
});

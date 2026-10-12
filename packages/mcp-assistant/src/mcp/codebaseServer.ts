/**
 * The codebase index as an MCP server, so coding agents (Claude Code or any
 * MCP client) can search the same Chroma index @Chat answers from.
 *
 * Only the search primitive is exposed, not the @Chat agent itself: the
 * client is already an agent with its own file tools, so a nested Claude
 * loop would add cost and latency and hide what was retrieved.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import {
  type CodeSnippet,
  formatSnippets,
  MissingIndexError,
} from "../codeSearch.js";
import {
  SEARCH_DEFAULT_RESULTS,
  SEARCH_MAX_RESULTS,
  VECTOR_STORE_UNAVAILABLE_CODE,
} from "../constants.js";
import type { IndexFreshness } from "../indexer.js";

export const MCP_SERVER_NAME = "vibe-chat-codebase";
const MCP_SERVER_VERSION = "0.1.0";

const BUILD_INDEX_COMMAND = "bun run chat:index";
const START_CHROMA_COMMAND =
  "docker run -d -p 127.0.0.1:8000:8000 chromadb/chroma:1.5.9";

// With tool search on, Claude Code loads only tool names and these
// instructions up front, so they carry the "when to reach for this" signal.
// Claude Code truncates them at 2,048 characters; keep the key point first.
const SERVER_INSTRUCTIONS =
  "Semantic search over the Vibe Chat monorepo (multi-AI group chat: React client, Socket.IO server, AI provider adapters, @Chat assistant, Docker/EC2 deploy). " +
  "Use search_codebase to find where a concept lives when you don't know the file or identifier yet, e.g. 'how an AI decides whether to reply' or 'where the @Chat cooldown is configured'. " +
  "For exact identifiers or strings, Grep is faster and always current. " +
  "The index is a snapshot: results say when it is out of date, and you should read the file before relying on line numbers.";

const SEARCH_TOOL_DESCRIPTION =
  "Embedding search over Vibe Chat's source, config and docs. Returns the closest chunks, each headed by `path:startLine-endLine`. " +
  "Use it when you know what something does but not what it is called; phrase the query the way the code would describe it, and rephrase if the results miss. " +
  "Prefer Grep for exact names. Not for code outside this repository.";

export type CodebaseMcpDependencies = {
  search: (query: string, limit: number) => Promise<CodeSnippet[]>;
  checkFreshness: () => Promise<IndexFreshness>;
};

const textResult = (text: string, isError = false): CallToolResult => ({
  content: [{ type: "text", text }],
  isError,
});

const STALE_INDEX_NOTE =
  `Note: the index was built from an older version of the files on disk, so some chunks or line ranges may be out of date. ` +
  `Read the file before relying on them, or run \`${BUILD_INDEX_COMMAND}\` to rebuild (about a minute).`;

/**
 * Failures come back as isError results with the fix spelled out, so the
 * client's model can act on them (run the command, fall back to Grep)
 * instead of seeing a bare protocol error.
 */
const describeFailure = (error: unknown): string => {
  if (error instanceof MissingIndexError) {
    return `${error.message} Build it with \`${BUILD_INDEX_COMMAND}\` from the repo root (about a minute), or use Grep meanwhile.`;
  }
  if ((error as { code?: string })?.code === VECTOR_STORE_UNAVAILABLE_CODE) {
    return `${(error as Error).message} Start it with \`${START_CHROMA_COMMAND}\`, then build the index with \`${BUILD_INDEX_COMMAND}\`.`;
  }
  return `search_codebase failed: ${(error as Error)?.message ?? error}. Use Grep instead.`;
};

export const createCodebaseMcpServer = ({
  search,
  checkFreshness,
}: CodebaseMcpDependencies): McpServer => {
  const server = new McpServer(
    { name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION },
    { instructions: SERVER_INSTRUCTIONS },
  );

  server.registerTool(
    "search_codebase",
    {
      title: "Search the Vibe Chat codebase",
      description: SEARCH_TOOL_DESCRIPTION,
      inputSchema: {
        query: z
          .string()
          .trim()
          .min(1)
          .describe(
            "What to look for, in natural language or identifiers, e.g. 'which AI gets to reply after an @mention'.",
          ),
        limit: z
          .number()
          .int()
          .min(1)
          .max(SEARCH_MAX_RESULTS)
          .optional()
          .describe(
            `How many chunks to return (default ${SEARCH_DEFAULT_RESULTS}).`,
          ),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ query, limit }) => {
      try {
        const [freshness, snippets] = await Promise.all([
          checkFreshness(),
          search(query, limit ?? SEARCH_DEFAULT_RESULTS),
        ]);
        const body =
          snippets.length > 0
            ? formatSnippets(snippets)
            : `No indexed code matched "${query}".`;
        return textResult(
          freshness === "stale" ? `${STALE_INDEX_NOTE}\n\n${body}` : body,
        );
      } catch (error) {
        const message = describeFailure(error);
        console.error(`[MCP] ${message}`);
        return textResult(message, true);
      }
    },
  );

  return server;
};

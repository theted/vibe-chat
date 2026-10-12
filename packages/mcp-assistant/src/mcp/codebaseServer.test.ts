import { describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { type CodeSnippet, MissingIndexError } from "../codeSearch";
import { VECTOR_STORE_UNAVAILABLE_CODE } from "../constants";
import type { IndexFreshness } from "../indexer";
import {
  type CodebaseMcpDependencies,
  createCodebaseMcpServer,
} from "./codebaseServer";

const SNIPPET: CodeSnippet = {
  relativePath: "packages/server/src/config/serverConfig.ts",
  startLine: 10,
  endLine: 24,
  content: "export const CHAT_ASSISTANT_AI_COOLDOWN_MS = 2 * 60 * 1000;",
  distance: 0.4,
};

// Talks to the server over an in-memory transport: the same JSON-RPC
// messages a real client sends, without spawning a process.
const connect = async (overrides: Partial<CodebaseMcpDependencies> = {}) => {
  const searches: Array<{ query: string; limit: number }> = [];
  const server = createCodebaseMcpServer({
    search: async (query, limit) => {
      searches.push({ query, limit });
      return [SNIPPET];
    },
    checkFreshness: async (): Promise<IndexFreshness> => "current",
    ...overrides,
  });
  const client = new Client({ name: "test-client", version: "0.0.0" });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  return { client, searches };
};

const callSearch = (
  client: Client,
  args: Record<string, unknown> = { query: "ai cooldown" },
) =>
  client.callTool({ name: "search_codebase", arguments: args }) as Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }>;

describe("codebase MCP server", () => {
  test("advertises one read-only tool and instructions", async () => {
    const { client } = await connect();
    const { tools } = await client.listTools();

    expect(tools.map((tool) => tool.name)).toEqual(["search_codebase"]);
    expect(tools[0].annotations?.readOnlyHint).toBe(true);
    expect(tools[0].inputSchema.required).toEqual(["query"]);
    expect(client.getInstructions()).toContain("search_codebase");
  });

  test("returns chunks headed by path and line range", async () => {
    const { client, searches } = await connect();
    const result = await callSearch(client, { query: "ai cooldown", limit: 3 });

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toStartWith(
      "[1] packages/server/src/config/serverConfig.ts:10-24\n",
    );
    expect(result.content[0].text).not.toContain("older version");
    expect(searches).toEqual([{ query: "ai cooldown", limit: 3 }]);
  });

  test("defaults the limit", async () => {
    const { client, searches } = await connect();
    await callSearch(client);
    expect(searches[0].limit).toBe(6);
  });

  test("warns when the index is older than the files on disk", async () => {
    const { client } = await connect({ checkFreshness: async () => "stale" });
    const { content } = await callSearch(client);

    expect(content[0].text).toStartWith("Note: the index was built from");
    expect(content[0].text).toContain("bun run chat:index");
    expect(content[0].text).toContain("serverConfig.ts:10-24");
  });

  test("tells the model how to build a missing index", async () => {
    const { client } = await connect({
      search: async () => {
        throw new MissingIndexError("The code index has not been built yet.");
      },
      checkFreshness: async () => "missing",
    });
    const result = await callSearch(client);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("bun run chat:index");
  });

  test("tells the model how to start Chroma when it is down", async () => {
    const unavailable = Object.assign(new Error("Unable to reach Chroma."), {
      code: VECTOR_STORE_UNAVAILABLE_CODE,
    });
    const { client } = await connect({
      checkFreshness: async () => {
        throw unavailable;
      },
    });
    const result = await callSearch(client);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("chromadb/chroma:1.5.9");
  });

  test("rejects an empty query before searching", async () => {
    const { client, searches } = await connect();
    const result = await callSearch(client, { query: "   " }).catch(
      (error: Error) => ({
        content: [{ type: "text", text: error.message }],
        isError: true,
      }),
    );

    expect(result.isError).toBe(true);
    expect(searches).toHaveLength(0);
  });
});

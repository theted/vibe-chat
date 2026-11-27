import { describe, expect, it, spyOn } from "bun:test";

import type { CodebaseSearch } from "../codeSearch.js";
import { EmbeddingProviderError } from "../embeddingErrors.js";
import { SEARCH_CODEBASE_TOOL_NAME } from "./definitions.js";
import { executeTool } from "./executeTool.js";

describe("executeTool search_codebase", () => {
  it("tells the model code search is down when the embedder is out of budget", async () => {
    const codebase = {
      search: async () => {
        throw new EmbeddingProviderError("mistral", 402, new Error("402"));
      },
    } as unknown as CodebaseSearch;
    const logged = spyOn(console, "error").mockImplementation(() => {});

    const outcome = await executeTool(
      SEARCH_CODEBASE_TOOL_NAME,
      { query: "chat history context limit" },
      { codebase },
    );
    const logCount = logged.mock.calls.length;
    logged.mockRestore();

    expect(outcome.isError).toBe(true);
    expect(outcome.content).toStartWith("Code search is unavailable:");
    expect(outcome.content).toContain("billing");
    expect(outcome.content).toContain("Don't retry search_codebase");
    expect(logCount).toBe(1);
  });
});

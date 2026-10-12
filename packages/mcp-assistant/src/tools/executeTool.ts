import {
  type CodebaseSearch,
  type CodeSnippet,
  formatSnippetLocation,
  MissingIndexError,
} from "../codeSearch.js";
import { SEARCH_DEFAULT_RESULTS } from "../constants.js";
import { browse, BrowseError, formatBrowseResult } from "./browse.js";
import { BROWSE_TOOL_NAME, SEARCH_CODEBASE_TOOL_NAME } from "./definitions.js";
import { UnsafeUrlError } from "./urlSafety.js";

export type ToolContext = {
  codebase: CodebaseSearch;
};

export type ToolOutcome = {
  content: string;
  isError: boolean;
  /** Code chunks the tool returned - later matched against the answer for source links */
  snippets: CodeSnippet[];
};

const failure = (content: string): ToolOutcome => ({
  content,
  isError: true,
  snippets: [],
});

const readStringField = (input: unknown, field: string): string | null => {
  const value = (input as Record<string, unknown> | null)?.[field];
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

const runSearchCodebase = async (
  input: unknown,
  { codebase }: ToolContext,
): Promise<ToolOutcome> => {
  const query = readStringField(input, "query");
  if (!query) return failure("search_codebase needs a non-empty `query`.");

  const snippets = await codebase.search(query, SEARCH_DEFAULT_RESULTS);
  if (snippets.length === 0) {
    return {
      content: `No indexed code matched "${query}".`,
      isError: false,
      snippets,
    };
  }

  const content = snippets
    .map(
      (snippet, index) =>
        `[${index + 1}] ${formatSnippetLocation(snippet)}\n${snippet.content}`,
    )
    .join("\n\n---\n\n");
  return { content, isError: false, snippets };
};

const runBrowse = async (input: unknown): Promise<ToolOutcome> => {
  const url = readStringField(input, "url");
  if (!url) return failure("browse needs a non-empty `url`.");

  const result = await browse(url);
  return { content: formatBrowseResult(result), isError: false, snippets: [] };
};

/**
 * Runs one client-side tool call. Expected failures come back as
 * `isError: true` results the model can read and recover from (try another
 * URL, rephrase the query) rather than exceptions that abort the whole turn.
 */
export const executeTool = async (
  name: string,
  input: unknown,
  context: ToolContext,
): Promise<ToolOutcome> => {
  try {
    switch (name) {
      case SEARCH_CODEBASE_TOOL_NAME:
        return await runSearchCodebase(input, context);
      case BROWSE_TOOL_NAME:
        return await runBrowse(input);
      default:
        return failure(`Unknown tool "${name}".`);
    }
  } catch (error) {
    if (
      error instanceof BrowseError ||
      error instanceof UnsafeUrlError ||
      error instanceof MissingIndexError
    ) {
      return failure(error.message);
    }
    console.error(`[ChatAgent] Tool "${name}" failed unexpectedly:`, error);
    return failure(
      `The ${name} tool failed unexpectedly (${(error as Error).message}). Try a different approach or answer with what you have.`,
    );
  }
};

import { existsSync } from "fs";
import path from "path";

// The monorepo root is the directory holding this package. (The server used
// to look for root-level scripts/run-mcp-chat.ts; those moved into
// packages/ai-chat-cli, and @Chat silently stopped starting.)
const WORKSPACE_ROOT_MARKER = path.join(
  "packages",
  "mcp-assistant",
  "package.json",
);

/** Walks up from startDir to the monorepo root, or null if there is none. */
export const findWorkspaceRoot = (startDir?: string): string | null => {
  if (!startDir) {
    return null;
  }

  let current = path.resolve(startDir);
  while (true) {
    if (existsSync(path.join(current, WORKSPACE_ROOT_MARKER))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
};

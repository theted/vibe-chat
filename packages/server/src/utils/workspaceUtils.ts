/**
 * Workspace resolution utilities for ChatAssistantService
 */

import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Search upward from startDir to find the workspace root containing MCP scripts
 */
export const findWorkspaceRoot = (startDir?: string): string | null => {
  if (!startDir) {
    return null;
  }

  let current = path.resolve(startDir);
  const visited = new Set();

  while (!visited.has(current)) {
    visited.add(current);
    const candidates = [
      path.join(current, "scripts", "run-mcp-chat.ts"),
      path.join(current, "scripts", "index-mcp-chat.ts"),
      path.join(current, "dist", "scripts", "run-mcp-chat.js"),
      path.join(current, "dist", "scripts", "index-mcp-chat.js"),
    ];
    const hasScripts = candidates.every((candidate) => existsSync(candidate));
    if (hasScripts) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  return null;
};

/**
 * Resolve workspace root from options, environment, or by searching upward
 */
export const resolveWorkspaceRoot = (
  options: { projectRoot?: string } = {},
  moduleUrl?: string
): { projectRoot: string; unresolved: boolean } => {
  const moduleDir = moduleUrl
    ? path.dirname(fileURLToPath(moduleUrl))
    : process.cwd();
  const envRoot = process.env.CHAT_ASSISTANT_ROOT;

  const explicitRoot =
    options.projectRoot || (envRoot ? envRoot.trim() : null);

  const resolvedProject =
    (explicitRoot && path.resolve(explicitRoot)) ||
    findWorkspaceRoot(moduleDir) ||
    findWorkspaceRoot(process.cwd());

  if (!resolvedProject) {
    return { projectRoot: moduleDir, unresolved: true };
  }

  return { projectRoot: resolvedProject, unresolved: false };
};

/**
 * Workspace resolution utilities for ChatAssistantService
 */

import path from "path";
import { fileURLToPath } from "url";
import { findWorkspaceRoot } from "@ai-chat/mcp-assistant";

/**
 * Resolve workspace root from options, environment, or by searching upward
 */
export const resolveWorkspaceRoot = (
  options: { projectRoot?: string } = {},
  moduleUrl?: string,
): { projectRoot: string; unresolved: boolean } => {
  const moduleDir = moduleUrl
    ? path.dirname(fileURLToPath(moduleUrl))
    : process.cwd();
  const envRoot = process.env.CHAT_ASSISTANT_ROOT;

  const explicitRoot = options.projectRoot || (envRoot ? envRoot.trim() : null);

  const resolvedProject =
    (explicitRoot && path.resolve(explicitRoot)) ||
    findWorkspaceRoot(moduleDir) ||
    findWorkspaceRoot(process.cwd());

  if (!resolvedProject) {
    return { projectRoot: moduleDir, unresolved: true };
  }

  return { projectRoot: resolvedProject, unresolved: false };
};

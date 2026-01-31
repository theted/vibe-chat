/**
 * Formatting utilities for ChatAssistantService responses
 */

export type VectorContext = {
  relativePath: string;
  startLine?: number | null;
  endLine?: number | null;
};

const GITHUB_BASE_URL = "https://github.com/theted/vibe-chat/blob/master";

/**
 * Format a file reference as a GitHub URL with optional line numbers
 */
export const formatGitHubUrl = (
  relativePath: string,
  startLine: number | null = null,
  endLine: number | null = null
): string => {
  const lineFragment =
    startLine && endLine
      ? `#L${startLine}-L${endLine}`
      : startLine
        ? `#L${startLine}`
        : "";
  return `${GITHUB_BASE_URL}/${relativePath}${lineFragment}`;
};

/**
 * Enhance an answer with source reference links
 */
export const enhanceAnswerWithLinks = (
  answer: string,
  contexts: VectorContext[] | undefined
): string => {
  if (!answer || !contexts || contexts.length === 0) {
    return answer;
  }

  let enhanced = answer;

  const sourceRefs = contexts
    .map((ctx) => {
      const lineInfo =
        ctx.startLine && ctx.endLine ? `:${ctx.startLine}-${ctx.endLine}` : "";
      const githubUrl = formatGitHubUrl(
        ctx.relativePath,
        ctx.startLine,
        ctx.endLine
      );
      return `- [\`${ctx.relativePath}${lineInfo}\`](${githubUrl})`;
    })
    .join("\n");

  // Append sources section if not already present
  if (
    !enhanced.includes("**Sources:**") &&
    !enhanced.includes("**References:**")
  ) {
    enhanced += `\n\n**Sources:**\n${sourceRefs}`;
  }

  return enhanced;
};

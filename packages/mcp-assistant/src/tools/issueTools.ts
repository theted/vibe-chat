/**
 * search_github_issues / create_github_issue. Every rule that matters - which
 * rooms may file, how many issues, what context goes in - is enforced here,
 * whatever the model was talked into by the conversation.
 */

import {
  FROM_CHAT_LABEL,
  ISSUE_KIND_LABELS,
  MAX_ISSUES_PER_QUESTION,
} from "../github/constants.js";
import type {
  CreatedIssue,
  GitHubIssuesClient,
} from "../github/githubIssues.js";
import {
  formatIssueBody,
  formatIssueTitle,
  type IssueKind,
  type IssueOrigin,
  type IssueSpec,
} from "../github/issueFormat.js";
import type { IssueLimiter } from "../github/issueLimiter.js";

export type IssueToolContext = {
  client: GitHubIssuesClient;
  limiter: IssueLimiter;
  /** Null when this question may not file issues (a private room) */
  origin: Omit<IssueOrigin, "filedAt"> | null;
  /** Issues filed while answering this question */
  filed: CreatedIssue[];
};

export type IssueToolResult = { content: string; isError: boolean };

const MINUTE_MS = 60_000;

const ok = (content: string): IssueToolResult => ({ content, isError: false });
const fail = (content: string): IssueToolResult => ({ content, isError: true });

const readString = (input: Record<string, unknown>, field: string): string =>
  typeof input[field] === "string" ? (input[field] as string).trim() : "";

const readStrings = (
  input: Record<string, unknown>,
  field: string,
): string[] =>
  Array.isArray(input[field])
    ? (input[field] as unknown[]).filter(
        (item): item is string =>
          typeof item === "string" && item.trim() !== "",
      )
    : [];

const isIssueKind = (value: string): value is IssueKind =>
  Object.hasOwn(ISSUE_KIND_LABELS, value);

export const runSearchIssues = async (
  input: unknown,
  { client }: IssueToolContext,
): Promise<IssueToolResult> => {
  const query = readString((input ?? {}) as Record<string, unknown>, "query");
  if (!query) return fail("search_github_issues needs a non-empty `query`.");

  const issues = await client.search(query);
  if (issues.length === 0) {
    return ok(`No issues in ${client.repo} match "${query}".`);
  }
  return ok(
    issues
      .map(
        ({ number, state, title, url }) =>
          `#${number} [${state}] ${title} - ${url}`,
      )
      .join("\n"),
  );
};

/** The spec fields from the tool input, or a message saying what's missing. */
export const readIssueSpec = (input: unknown): IssueSpec | string => {
  const fields = (input ?? {}) as Record<string, unknown>;
  const kind = readString(fields, "kind");
  const spec = {
    title: formatIssueTitle(readString(fields, "title")),
    summary: readString(fields, "summary"),
    motivation: readString(fields, "motivation"),
    proposal: readString(fields, "proposal"),
    acceptanceCriteria: readStrings(fields, "acceptance_criteria"),
    openQuestions: readStrings(fields, "open_questions"),
  };

  if (!isIssueKind(kind)) return '`kind` must be "feature" or "bug".';
  if (!spec.title || !spec.summary)
    return "An issue needs a `title` and a `summary`.";
  if (spec.acceptanceCriteria.length === 0) {
    return "Add at least one acceptance criterion: a testable statement of done.";
  }
  return { kind, ...spec };
};

export const runCreateIssue = async (
  input: unknown,
  context: IssueToolContext,
): Promise<IssueToolResult> => {
  const { client, limiter, origin, filed } = context;
  if (!origin) {
    return fail(
      "Issues can only be filed from the main room, where the conversation is already public. Suggest asking there instead.",
    );
  }
  if (filed.length >= MAX_ISSUES_PER_QUESTION) {
    return fail(
      `You already filed #${filed[0].number} for this question. Mention that one instead.`,
    );
  }

  const block = limiter.check();
  if (block) {
    const minutes = Math.ceil(block.retryAfterMs / MINUTE_MS);
    const hours = block.limit.windowMs / MINUTE_MS / 60;
    return fail(
      `The issue limit is reached (${block.limit.maxIssues} per ${hours} h). Don't retry: tell the room filing is paused for about ${minutes} minutes.`,
    );
  }

  const spec = readIssueSpec(input);
  if (typeof spec === "string") return fail(spec);

  const issue = await client.create({
    title: spec.title,
    body: formatIssueBody(spec, { ...origin, filedAt: new Date() }),
    labels: [FROM_CHAT_LABEL, ISSUE_KIND_LABELS[spec.kind]],
  });
  limiter.record();
  filed.push(issue);
  console.info(
    `[ChatAgent] Filed issue #${issue.number} "${issue.title}" for ${origin.requesterType} "${origin.requestedBy}"`,
  );
  return ok(
    `Filed #${issue.number}: ${issue.url}. Share this link in your reply.`,
  );
};

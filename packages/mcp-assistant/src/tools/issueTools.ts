/**
 * search_github_issues / create_github_issue / add_github_issue_comment. Every
 * rule that matters - which rooms may file, how many issues and comments,
 * which issues take comments, what context goes in - is enforced here,
 * whatever the model was talked into by the conversation.
 */

import {
  FROM_CHAT_LABEL,
  ISSUE_KIND_LABELS,
  MAX_COMMENTS_PER_QUESTION,
  MAX_ISSUES_PER_QUESTION,
} from "../github/constants.js";
import type {
  CreatedIssue,
  GitHubIssuesClient,
  IssueDetails,
  PostedComment,
} from "../github/githubIssues.js";
import {
  formatCommentBody,
  formatIssueBody,
  formatIssueTitle,
  type IssueKind,
  type IssueOrigin,
  type IssueSpec,
} from "../github/issueFormat.js";
import type { IssueLimitBlock, IssueLimiter } from "../github/issueLimiter.js";

export type IssueToolContext = {
  client: GitHubIssuesClient;
  limiter: IssueLimiter;
  /** Separate caps for comments, shared across rooms like `limiter` */
  commentLimiter: IssueLimiter;
  /** Null when this question may not file issues or comment (a private room) */
  origin: Omit<IssueOrigin, "filedAt"> | null;
  /** Issues filed while answering this question */
  filed: CreatedIssue[];
  /** Comments posted while answering this question */
  commented: PostedComment[];
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

const PRIVATE_ROOM_REFUSAL =
  "GitHub issues can only be filed or commented on from the main room, where the conversation is already public. Suggest asking there instead.";

const describeBlock = (block: IssueLimitBlock, what: string): string => {
  const minutes = Math.ceil(block.retryAfterMs / MINUTE_MS);
  const hours = block.limit.windowMs / MINUTE_MS / 60;
  return `The ${what} limit is reached (${block.limit.maxCount} per ${hours} h). Don't retry: tell the room it's paused for about ${minutes} minutes.`;
};

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
  if (!origin) return fail(PRIVATE_ROOM_REFUSAL);
  if (filed.length >= MAX_ISSUES_PER_QUESTION) {
    return fail(
      `You already filed #${filed[0].number} for this question. Mention that one instead.`,
    );
  }

  const block = limiter.check();
  if (block) return fail(describeBlock(block, "issue filing"));

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

/**
 * Why @Chat may not comment on this issue, or null if it may. Only open
 * issues it filed itself (labelled from-chat), so it can't pile onto
 * maintainers' issues or PRs.
 */
export const commentRefusal = (issue: IssueDetails): string | null => {
  if (issue.isPullRequest) {
    return `#${issue.number} is a pull request; you can only comment on issues you filed.`;
  }
  if (issue.state !== "open") {
    return `#${issue.number} is ${issue.state}; you can only comment on open issues. Suggest filing a new one if it's still needed.`;
  }
  if (!issue.labels.includes(FROM_CHAT_LABEL)) {
    return `#${issue.number} wasn't filed from this chat (no ${FROM_CHAT_LABEL} label); you can only comment on issues you filed.`;
  }
  return null;
};

const readIssueNumber = (input: Record<string, unknown>): number | null => {
  const value = input.issue_number;
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : null;
};

export const runAddIssueComment = async (
  input: unknown,
  context: IssueToolContext,
): Promise<IssueToolResult> => {
  const { client, commentLimiter, origin, commented } = context;
  if (!origin) return fail(PRIVATE_ROOM_REFUSAL);
  if (commented.length >= MAX_COMMENTS_PER_QUESTION) {
    return fail(
      `You already commented on #${commented[0].issueNumber} for this question (${commented[0].url}). Mention that instead.`,
    );
  }

  const block = commentLimiter.check();
  if (block) return fail(describeBlock(block, "issue comment"));

  const fields = (input ?? {}) as Record<string, unknown>;
  const issueNumber = readIssueNumber(fields);
  const text = readString(fields, "comment");
  if (!issueNumber) return fail("`issue_number` must be a positive integer.");
  if (!text) return fail("A comment needs non-empty `comment` text.");

  const refusal = commentRefusal(await client.get(issueNumber));
  if (refusal) return fail(refusal);

  const posted = await client.comment(
    issueNumber,
    formatCommentBody(text, { ...origin, filedAt: new Date() }),
  );
  commentLimiter.record();
  commented.push(posted);
  console.info(
    `[ChatAgent] Commented on issue #${issueNumber} for ${origin.requesterType} "${origin.requestedBy}"`,
  );
  return ok(
    `Commented on #${issueNumber}: ${posted.url}. Share this link in your reply.`,
  );
};

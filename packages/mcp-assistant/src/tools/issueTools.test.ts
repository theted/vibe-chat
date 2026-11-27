import { describe, expect, test } from "bun:test";

import type { GitHubIssuesClient, IssueDetails } from "../github/githubIssues";
import { IssueLimiter } from "../github/issueLimiter";
import {
  type IssueToolContext,
  readIssueSpec,
  runAddIssueComment,
  runCreateIssue,
} from "./issueTools";

const HOUR_MS = 3_600_000;

const input = {
  kind: "feature",
  title: "Let people mute a model",
  summary: "Mute one model.",
  motivation: "",
  proposal: "A toggle.",
  acceptance_criteria: ["Muted models stay quiet"],
  open_questions: [],
};

const chatIssue: IssueDetails = {
  number: 42,
  title: "Let people mute a model",
  state: "open",
  labels: ["from-chat", "enhancement"],
  isPullRequest: false,
  url: "https://github.com/theted/vibe-chat/issues/42",
};

const makeContext = (
  overrides: Partial<IssueToolContext> = {},
  existing: IssueDetails = chatIssue,
) => {
  const created: { title: string; body: string; labels: string[] }[] = [];
  const comments: { issueNumber: number; body: string }[] = [];
  const client = {
    repo: "theted/vibe-chat",
    get: async () => existing,
    comment: async (issueNumber: number, body: string) => {
      comments.push({ issueNumber, body });
      return {
        issueNumber,
        url: `https://github.com/theted/vibe-chat/issues/${issueNumber}#issuecomment-1`,
      };
    },
    create: async (issue: (typeof created)[number]) => {
      created.push(issue);
      return {
        number: 42,
        title: issue.title,
        url: "https://github.com/theted/vibe-chat/issues/42",
      };
    },
  } as unknown as GitHubIssuesClient;
  const context: IssueToolContext = {
    client,
    limiter: new IssueLimiter(),
    commentLimiter: new IssueLimiter(),
    origin: {
      requestedBy: "ada",
      requesterType: "human",
      roomId: "default",
      model: "m",
      transcript: [],
    },
    filed: [],
    commented: [],
    ...overrides,
  };
  return { context, created, comments };
};

describe("create_github_issue", () => {
  test("files with the app's labels and reports the link", async () => {
    const { context, created } = makeContext();

    const result = await runCreateIssue(input, context);

    expect(result).toEqual({
      content:
        "Filed #42: https://github.com/theted/vibe-chat/issues/42. Share this link in your reply.",
      isError: false,
    });
    expect(created[0].labels).toEqual(["from-chat", "enhancement"]);
    expect(created[0].body).toContain("at the request of **ada** (human)");
  });

  test("files one issue per question", async () => {
    const { context, created } = makeContext();
    await runCreateIssue(input, context);

    const second = await runCreateIssue(input, context);

    expect(second.isError).toBe(true);
    expect(second.content).toContain("already filed #42");
    expect(created).toHaveLength(1);
  });

  test("refuses in private rooms", async () => {
    const { context, created } = makeContext({ origin: null });
    const result = await runCreateIssue(input, context);
    expect(result.isError).toBe(true);
    expect(created).toHaveLength(0);
  });

  test("stops at the global limit and says how long to wait", async () => {
    const limiter = new IssueLimiter([{ windowMs: HOUR_MS, maxCount: 1 }]);
    limiter.record();
    const { context, created } = makeContext({ limiter });

    const result = await runCreateIssue(input, context);

    expect(result.isError).toBe(true);
    expect(result.content).toMatch(/paused for about 60 minutes/);
    expect(created).toHaveLength(0);
  });
});

describe("readIssueSpec", () => {
  test("needs a testable acceptance criterion", () => {
    expect(readIssueSpec({ ...input, acceptance_criteria: [" "] })).toContain(
      "acceptance criterion",
    );
  });

  test("only knows features and bugs", () => {
    expect(readIssueSpec({ ...input, kind: "chore" })).toContain("feature");
  });
});

describe("add_github_issue_comment", () => {
  const commentInput = { issue_number: 42, comment: "Also @grok needs it." };

  test("comments with the app's header and reports the link", async () => {
    const { context, comments } = makeContext();

    const result = await runAddIssueComment(commentInput, context);

    expect(result).toEqual({
      content:
        "Commented on #42: https://github.com/theted/vibe-chat/issues/42#issuecomment-1. Share this link in your reply.",
      isError: false,
    });
    expect(comments[0].body).toContain("at the request of **ada** (human)");
    expect(comments[0].body).toContain("Also `@grok` needs it.");
    expect(context.commented).toHaveLength(1);
  });

  test("comments once per question", async () => {
    const { context, comments } = makeContext();
    await runAddIssueComment(commentInput, context);

    const second = await runAddIssueComment(commentInput, context);

    expect(second.isError).toBe(true);
    expect(second.content).toContain("already commented on #42");
    expect(comments).toHaveLength(1);
  });

  test("refuses in private rooms", async () => {
    const { context, comments } = makeContext({ origin: null });
    const result = await runAddIssueComment(commentInput, context);
    expect(result.isError).toBe(true);
    expect(comments).toHaveLength(0);
  });

  test("has its own limit, apart from filing", async () => {
    const commentLimiter = new IssueLimiter([
      { windowMs: HOUR_MS, maxCount: 1 },
    ]);
    commentLimiter.record();
    const { context, comments } = makeContext({ commentLimiter });

    const result = await runAddIssueComment(commentInput, context);

    expect(result.isError).toBe(true);
    expect(result.content).toContain("issue comment limit");
    expect(comments).toHaveLength(0);
    expect(context.limiter.check()).toBeNull();
  });

  test.each([
    ["a pull request", { isPullRequest: true }, "pull request"],
    ["a closed issue", { state: "closed" }, "is closed"],
    ["an issue not filed from chat", { labels: ["bug"] }, "from-chat"],
  ])("refuses %s", async (_name, changes, reason) => {
    const { context, comments } = makeContext({}, { ...chatIssue, ...changes });

    const result = await runAddIssueComment(commentInput, context);

    expect(result.isError).toBe(true);
    expect(result.content).toContain(reason);
    expect(comments).toHaveLength(0);
  });

  test("needs an issue number and some text", async () => {
    const { context } = makeContext();
    expect(
      (await runAddIssueComment({ issue_number: "42", comment: "x" }, context))
        .content,
    ).toContain("issue_number");
    expect(
      (await runAddIssueComment({ issue_number: 42, comment: " " }, context))
        .content,
    ).toContain("non-empty");
  });
});

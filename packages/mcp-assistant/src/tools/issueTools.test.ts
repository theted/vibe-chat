import { describe, expect, test } from "bun:test";

import type { GitHubIssuesClient } from "../github/githubIssues";
import { IssueLimiter } from "../github/issueLimiter";
import {
  type IssueToolContext,
  readIssueSpec,
  runCreateIssue,
} from "./issueTools";

const input = {
  kind: "feature",
  title: "Let people mute a model",
  summary: "Mute one model.",
  motivation: "",
  proposal: "A toggle.",
  acceptance_criteria: ["Muted models stay quiet"],
  open_questions: [],
};

const makeContext = (overrides: Partial<IssueToolContext> = {}) => {
  const created: { title: string; body: string; labels: string[] }[] = [];
  const client = {
    repo: "theted/vibe-chat",
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
    origin: {
      requestedBy: "ada",
      requesterType: "human",
      roomId: "default",
      model: "m",
      transcript: [],
    },
    filed: [],
    ...overrides,
  };
  return { context, created };
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
    const limiter = new IssueLimiter([{ windowMs: 3_600_000, maxIssues: 1 }]);
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

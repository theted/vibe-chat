import { describe, expect, mock, test } from "bun:test";

import { GitHubIssuesClient, GitHubIssuesError } from "./githubIssues";

const respond = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status });

describe("GitHubIssuesClient", () => {
  test("rejects anything that isn't owner/name", () => {
    expect(() => new GitHubIssuesClient("t", "not a repo")).toThrow();
  });

  test("searches only its own repo, whatever the query says", async () => {
    const fetchFn = mock(async () => respond(200, { items: [] }));
    const client = new GitHubIssuesClient(
      "t",
      "theted/vibe-chat",
      fetchFn as never,
    );

    await client.search('dark mode" repo:evil/repo is:pr');

    const url = new URL(String(fetchFn.mock.calls[0][0]));
    expect(url.searchParams.get("q")).toBe(
      "dark mode repo evil repo is pr repo:theted/vibe-chat is:issue",
    );
  });

  test("files unlabelled when the repo lacks a label it may not create", async () => {
    const fetchFn = mock(async (_url: string, init: RequestInit) =>
      JSON.parse(String(init.body)).labels.length
        ? respond(422, { message: "Validation Failed" })
        : respond(201, {
            number: 7,
            title: "T",
            html_url: "https://github.com/x/y/issues/7",
          }),
    );
    const client = new GitHubIssuesClient("t", "x/y", fetchFn as never);

    const issue = await client.create({
      title: "T",
      body: "B",
      labels: ["from-chat"],
    });

    expect(issue).toEqual({
      number: 7,
      title: "T",
      url: "https://github.com/x/y/issues/7",
    });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  test("turns other failures into a readable error", async () => {
    const client = new GitHubIssuesClient("t", "x/y", (async () =>
      respond(403, { message: "Resource not accessible" })) as never);
    const error = await client
      .create({ title: "T", body: "B", labels: [] })
      .catch((e) => e);
    expect(error).toBeInstanceOf(GitHubIssuesError);
    expect(error.message).toContain("403");
  });
});

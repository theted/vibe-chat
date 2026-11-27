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

  test("reads an issue's state, labels and whether it's a PR", async () => {
    const client = new GitHubIssuesClient("t", "x/y", (async () =>
      respond(200, {
        number: 7,
        title: "T",
        state: "open",
        html_url: "https://github.com/x/y/pull/7",
        labels: [{ name: "from-chat" }, "bug"],
        pull_request: { url: "x" },
      })) as never);

    expect(await client.get(7)).toEqual({
      number: 7,
      title: "T",
      state: "open",
      labels: ["from-chat", "bug"],
      isPullRequest: true,
      url: "https://github.com/x/y/pull/7",
    });
  });

  test("posts a comment to the issue's comments endpoint", async () => {
    const fetchFn = mock(async () =>
      respond(201, {
        html_url: "https://github.com/x/y/issues/7#issuecomment-9",
      }),
    );
    const client = new GitHubIssuesClient("t", "x/y", fetchFn as never);

    const posted = await client.comment(7, "Hello");

    const [url, init] = fetchFn.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://api.github.com/repos/x/y/issues/7/comments");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ body: "Hello" });
    expect(posted).toEqual({
      issueNumber: 7,
      url: "https://github.com/x/y/issues/7#issuecomment-9",
    });
  });

  test("refuses issue numbers that aren't positive integers", async () => {
    const fetchFn = mock(async () => respond(200, {}));
    const client = new GitHubIssuesClient("t", "x/y", fetchFn as never);
    await expect(client.comment(1.5, "x")).rejects.toThrow("positive integer");
    await expect(client.get(0)).rejects.toThrow("positive integer");
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

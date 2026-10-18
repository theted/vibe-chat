/**
 * Minimal GitHub REST client for the one repo @Chat files issues in: search
 * and create, nothing else. The token should be a fine-grained one with
 * only "Issues: read and write" on that repo.
 */

import {
  GITHUB_API_URL,
  GITHUB_API_VERSION,
  GITHUB_REQUEST_TIMEOUT_MS,
  ISSUE_SEARCH_RESULTS,
} from "./constants.js";

export type FoundIssue = {
  number: number;
  title: string;
  state: string;
  url: string;
};

export type CreatedIssue = { number: number; title: string; url: string };

type FetchFn = typeof fetch;

export class GitHubIssuesError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "GitHubIssuesError";
  }
}

const REPO_PATTERN = /^[\w.-]+\/[\w.-]+$/;

export class GitHubIssuesClient {
  constructor(
    private readonly token: string,
    readonly repo: string,
    private readonly fetchFn: FetchFn = fetch,
  ) {
    if (!REPO_PATTERN.test(repo)) {
      throw new Error(`GitHub repo must look like "owner/name", got "${repo}"`);
    }
  }

  /** Open and closed issues whose title or body match the words given. */
  async search(query: string): Promise<FoundIssue[]> {
    // Quotes and qualifiers in the query could widen the search beyond this
    // repo or break it; keep words only
    const words = query
      .replace(/[^\p{L}\p{N}\s-]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
    const q = `${words} repo:${this.repo} is:issue`;
    const data = await this.request<{
      items: {
        number: number;
        title: string;
        state: string;
        html_url: string;
      }[];
    }>(
      `/search/issues?q=${encodeURIComponent(q)}&per_page=${ISSUE_SEARCH_RESULTS}`,
    );
    return data.items.map(({ number, title, state, html_url }) => ({
      number,
      title,
      state,
      url: html_url,
    }));
  }

  async create(issue: {
    title: string;
    body: string;
    labels: string[];
  }): Promise<CreatedIssue> {
    const post = (labels: string[]) =>
      this.request<{ number: number; title: string; html_url: string }>(
        `/repos/${this.repo}/issues`,
        { method: "POST", body: JSON.stringify({ ...issue, labels }) },
      );

    let created;
    try {
      created = await post(issue.labels);
    } catch (error) {
      // A token that may file issues but not create labels gets a 422 for a
      // label the repo doesn't have yet: file it unlabelled rather than not at all
      if (!(error instanceof GitHubIssuesError) || error.status !== 422) {
        throw error;
      }
      console.warn(
        `[ChatAgent] Filing issue without labels (${issue.labels.join(", ")}): ${error.message}`,
      );
      created = await post([]);
    }
    return {
      number: created.number,
      title: created.title,
      url: created.html_url,
    };
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.fetchFn(`${GITHUB_API_URL}${path}`, {
      ...init,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        "User-Agent": "vibe-chat-assistant",
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
      },
      signal: AbortSignal.timeout(GITHUB_REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new GitHubIssuesError(
        `GitHub answered ${response.status} for ${init.method ?? "GET"} ${path.split("?")[0]}: ${detail.slice(0, 200)}`,
        response.status,
      );
    }
    return (await response.json()) as T;
  }
}

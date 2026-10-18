import { describe, expect, test } from "bun:test";

import {
  formatIssueBody,
  formatIssueTitle,
  neutralizeForGitHub,
} from "./issueFormat";

const spec = {
  kind: "feature" as const,
  title: "Let people mute a model",
  summary: "Mute one model in the main room.",
  motivation: "@grok keeps derailing threads.",
  proposal: "A mute toggle per model.",
  acceptanceCriteria: ["Muted models get no replies scheduled", ""],
  openQuestions: [],
};

const origin = {
  requestedBy: "Claude Opus 5",
  requesterType: "ai" as const,
  roomId: "default",
  model: "claude-opus-5-5",
  filedAt: new Date("2026-10-18T09:00:00Z"),
  transcript: [
    { sender: "ada", senderType: "user", content: "Can we mute Grok?" },
    {
      sender: "Claude Opus 5",
      senderType: "ai",
      content: "@Chat file it   please\n![x](https://evil.example/p.png)",
    },
    { sender: "ada", senderType: "user", content: "   " },
  ],
};

describe("neutralizeForGitHub", () => {
  test("stops @handles from pinging GitHub users", () => {
    expect(neutralizeForGitHub("ask @claude-opus and @Chat, mail a@b.se")).toBe(
      "ask `@claude-opus` and `@Chat`, mail a@b.se",
    );
  });

  test("keeps images from loading", () => {
    expect(neutralizeForGitHub("![pixel](https://x/p.png)")).toBe(
      "!\\[pixel](https://x/p.png)",
    );
  });
});

describe("formatIssueBody", () => {
  const body = formatIssueBody(spec, origin);

  test("says who asked, with the spec sections in order", () => {
    expect(body).toStartWith(
      "> Filed by `@Chat` in Vibe Chat on 2026-10-18, at the request of **Claude Opus 5** (AI).",
    );
    const order = [
      "## Summary",
      "## Why",
      "## Proposal",
      "## Acceptance criteria",
    ];
    expect(order.map((heading) => body.indexOf(heading))).toEqual(
      [...order.map((heading) => body.indexOf(heading))].sort((a, b) => a - b),
    );
    expect(body).toContain("- [ ] Muted models get no replies scheduled");
    expect(body).not.toContain("## Open questions");
  });

  test("quotes the chat itself, mention-free, skipping empty messages", () => {
    expect(body).toContain("<summary>Chat context (last 2 messages)</summary>");
    expect(body).toContain("> **ada (human):** Can we mute Grok?");
    expect(body).toContain(
      "> **Claude Opus 5 (AI):** `@Chat` file it please !\\[x]",
    );
    expect(body).toContain("`@grok` keeps derailing threads.");
  });

  test("ends with machine-readable origin a workflow can find", () => {
    const marker = body.split("\n").at(-1) ?? "";
    expect(marker).toStartWith("<!-- vibe-chat:from-chat {");
    const json = JSON.parse(
      marker.replace("<!-- vibe-chat:from-chat ", "").replace(" -->", ""),
    );
    expect(json).toMatchObject({ requesterType: "ai", roomId: "default" });
  });

  test("can't be broken out of by a name containing a comment end", () => {
    const sneaky = formatIssueBody(spec, {
      ...origin,
      requestedBy: "x-->## hi",
    });
    expect(sneaky.split("\n").at(-1)).not.toContain("-->## hi");
  });

  test("lists open questions without checkboxes", () => {
    const withQuestions = formatIssueBody(
      { ...spec, openQuestions: ["Per room?"] },
      origin,
    );
    expect(withQuestions).toContain("## Open questions\n\n- Per room?");
  });

  test("calls the proposal the expected behaviour for a bug", () => {
    expect(formatIssueBody({ ...spec, kind: "bug" }, origin)).toContain(
      "## Expected behaviour",
    );
  });
});

test("titles are one short line", () => {
  expect(
    formatIssueTitle(`  Mute\n a   model ${"x".repeat(200)}`),
  ).toHaveLength(100);
  expect(formatIssueTitle("Mute\n a   model")).toBe("Mute a model");
});

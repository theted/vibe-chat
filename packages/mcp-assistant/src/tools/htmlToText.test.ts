import { describe, expect, test } from "bun:test";

import { extractLinks, extractTitle, htmlToText } from "./htmlToText";

const PAGE = `<!doctype html>
<html><head><title>Docs &amp; Guides</title><style>body { color: red }</style></head>
<body>
  <script>alert("never shown")</script>
  <h1>Getting&nbsp;started</h1>
  <p>Install with <code>bun add chromadb</code> &#8212; then run it.</p>
  <!-- hidden comment -->
  <a href="/guide#intro">Guide</a>
  <a href="https://example.org/api">API <b>reference</b></a>
  <a href="/guide">Guide again</a>
  <a href="mailto:team@example.com">Mail</a>
</body></html>`;

describe("htmlToText", () => {
  test("keeps readable text and drops scripts, styles and comments", () => {
    const text = htmlToText(PAGE);
    expect(text).toContain("Getting started");
    expect(text).toContain("Install with bun add chromadb — then run it.");
    expect(text).not.toContain("alert");
    expect(text).not.toContain("color: red");
    expect(text).not.toContain("hidden comment");
  });

  test("decodes the title", () => {
    expect(extractTitle(PAGE)).toBe("Docs & Guides");
  });
});

describe("extractLinks", () => {
  test("resolves relative links, drops fragments, duplicates and non-http", () => {
    const links = extractLinks(
      PAGE,
      new URL("https://docs.example.com/start"),
      10,
    );
    expect(links).toEqual([
      { text: "Guide", url: "https://docs.example.com/guide" },
      { text: "API reference", url: "https://example.org/api" },
    ]);
  });

  test("respects the limit", () => {
    expect(
      extractLinks(PAGE, new URL("https://docs.example.com/"), 1),
    ).toHaveLength(1);
  });
});

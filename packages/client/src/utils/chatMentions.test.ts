import { describe, expect, it } from "vitest";
import { formatMentionsForMarkdown } from "./chatMentions";

const PEOPLE = ["Theted"];
const format = (content: string) =>
  formatMentionsForMarkdown(content, [], PEOPLE);

describe("formatMentionsForMarkdown", () => {
  it("wraps people, models and @Chat as code spans", () => {
    expect(format("@Theted ask @chat or @claude-opus-5")).toBe(
      "`@Theted` ask `@chat` or `@claude-opus-5`",
    );
  });

  it("keeps a bolded mention bold around the chip", () => {
    expect(format("**@Theted** hi")).toBe("**`@Theted`** hi");
  });

  it("leaves mentions inside inline code and fenced blocks alone", () => {
    expect(format("see `@Theted` here")).toBe("see `@Theted` here");
    const fenced = "```\n@Theted wrote this\n```\nthen @Theted";
    expect(format(fenced)).toBe("```\n@Theted wrote this\n```\nthen `@Theted`");
  });

  it("leaves emails, URLs and unknown names alone", () => {
    const text = "mail me@Theted.dev, medium.com/@Theted or @someone";
    expect(format(text)).toBe(text);
  });
});

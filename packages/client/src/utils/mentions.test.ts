import { describe, it, expect } from "vitest";
import { findMentionMatches, resolveMentionVoiceKey } from "./mentions";

describe("mentions utilities", () => {
  it("matches @mentions with spaces from known AI names", () => {
    const text = "Hello @Claude Haiku 4.5!";
    const matches = findMentionMatches(text);

    expect(matches).toHaveLength(1);
    expect(matches[0]?.text).toBe("@Claude Haiku 4.5");
  });

  it("matches a model's hyphenated handle as well as its dotted alias", () => {
    expect(findMentionMatches("@gpt-6-2-astra hi")[0]?.text).toBe(
      "@gpt-6-2-astra",
    );
    expect(findMentionMatches("@gpt-6.2-astra hi")[0]?.text).toBe(
      "@gpt-6.2-astra",
    );
  });

  it("matches @mentions from extra candidates", () => {
    const text = "Hello @Skylar welcome back.";
    const matches = findMentionMatches(text, [], ["Skylar"]);

    expect(matches).toHaveLength(1);
    expect(matches[0]?.text).toBe("@Skylar");
  });

  it("ignores an @ inside an email address or URL", () => {
    expect(
      findMentionMatches("mail skylar@Skylar.dev", [], ["Skylar"]),
    ).toHaveLength(0);
    expect(
      findMentionMatches("https://medium.com/@Skylar/post", [], ["Skylar"]),
    ).toHaveLength(0);
    expect(findMentionMatches("(@Skylar)", [], ["Skylar"])).toHaveLength(1);
  });

  it("resolves a model mention to that model's voice, aliases included", () => {
    expect(resolveMentionVoiceKey("@claude-opus-5")).toBe(
      "anthropicclaudeopus5",
    );
    expect(resolveMentionVoiceKey("@Claude Opus 5")).toBe(
      "anthropicclaudeopus5",
    );
    expect(resolveMentionVoiceKey("@gpt-6")).toBe(
      resolveMentionVoiceKey("@gpt-6-astra"),
    );
    expect(resolveMentionVoiceKey("@gpt-6")).not.toBe(
      resolveMentionVoiceKey("@claude-opus-5"),
    );
  });

  it.each(["@Chat", "@chat"])("matches the %s assistant", (mention) => {
    expect(findMentionMatches(`${mention} what changed?`)[0]?.text).toBe(
      mention,
    );
  });

  it("does not take @Chat out of a longer word", () => {
    expect(findMentionMatches("@chatty or @chat_bot")).toHaveLength(0);
  });

  it.each([
    ["bolded", "**@Theted** hi"],
    ["followed by an em dash", "@Theted—ok"],
    ["followed by an ellipsis", "@Theted…"],
    ["followed by an emoji", "hi @Theted👋"],
    ["followed by a slash", "@Theted/Skylar"],
  ])("ends a mention %s", (_label, text) => {
    expect(findMentionMatches(text, [], ["Theted"])[0]?.text).toBe("@Theted");
  });

  it("keeps a username running through underscores and hyphens", () => {
    expect(findMentionMatches("@Theted_2 @Theted-x", [], ["Theted"])).toEqual(
      [],
    );
    expect(
      findMentionMatches(
        "@ted_smith and @ted-smith",
        [],
        ["Ted_Smith", "ted-smith"],
      ).map(({ text }) => text),
    ).toEqual(["@ted_smith", "@ted-smith"]);
  });

  it("gives @Chat the voice its own answers speak in", () => {
    expect(resolveMentionVoiceKey("@Chat")).toBe("internalchatassistant");
    expect(resolveMentionVoiceKey("@chat")).toBe("internalchatassistant");
  });

  it("leaves people and unknown names without a voice", () => {
    expect(resolveMentionVoiceKey("@Skylar")).toBeNull();
    expect(resolveMentionVoiceKey("@")).toBeNull();
  });
});

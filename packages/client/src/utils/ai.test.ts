import { describe, it, expect } from "vitest";
import { normalizeAlias, resolveEmoji, mapMentionsToAiNames } from "./ai.ts";

describe("normalizeAlias", () => {
  it("should convert string to lowercase and remove non-alphanumeric characters", () => {
    expect(normalizeAlias("Claude-3")).toBe("claude3");
    expect(normalizeAlias("GPT-4")).toBe("gpt4");
    expect(normalizeAlias("z.ai")).toBe("zai");
  });

  it("should handle special characters and spaces", () => {
    expect(normalizeAlias("Command R+")).toBe("commandr");
    expect(normalizeAlias("Gemini 2.0")).toBe("gemini20");
    expect(normalizeAlias("@claude")).toBe("claude");
  });

  it("should handle empty and null values", () => {
    expect(normalizeAlias("")).toBe("");
    expect(normalizeAlias(null)).toBe("");
    expect(normalizeAlias(undefined)).toBe("");
  });

  it("should handle numeric values", () => {
    expect(normalizeAlias(123)).toBe("123");
    expect(normalizeAlias(0)).toBe("0");
  });

  it("should preserve alphanumeric characters only", () => {
    expect(normalizeAlias("abc123XYZ")).toBe("abc123xyz");
    expect(normalizeAlias("test@#$%test")).toBe("testtest");
  });

  it("should handle unicode characters", () => {
    expect(normalizeAlias("cafe")).toBe("cafe");
    expect(normalizeAlias("robot")).toBe("robot");
  });
});

describe("resolveEmoji", () => {
  it("should return default robot emoji for empty or null values", () => {
    expect(resolveEmoji("")).toBe("🤖");
    expect(resolveEmoji(null)).toBe("🤖");
    expect(resolveEmoji(undefined)).toBe("🤖");
  });

  it("should resolve direct matches for AI providers", () => {
    expect(resolveEmoji("claude")).toBe("🎹");
    expect(resolveEmoji("anthropic")).toBe("🎹");
    expect(resolveEmoji("gpt")).toBe("🧠");
    expect(resolveEmoji("gpt4")).toBe("🧠");
    expect(resolveEmoji("openai")).toBe("🧠");
    expect(resolveEmoji("grok")).toBe("🦾");
    expect(resolveEmoji("gemini")).toBe("💎");
    expect(resolveEmoji("mistral")).toBe("🌪️");
    expect(resolveEmoji("cohere")).toBe("🔮");
    expect(resolveEmoji("kimi")).toBe("🎯");
    expect(resolveEmoji("perplexity")).toBe("🔊");
  });

  it("should handle case insensitivity", () => {
    expect(resolveEmoji("CLAUDE")).toBe("🎹");
    expect(resolveEmoji("GPT")).toBe("🧠");
    expect(resolveEmoji("Gemini")).toBe("💎");
  });

  it("should handle special characters in input", () => {
    expect(resolveEmoji("gpt-4")).toBe("🧠");
    expect(resolveEmoji("z.ai")).toBe("🔆");
    // "command-r" normalizes to "commandr", matches "command" prefix -> 🔮
    expect(resolveEmoji("command-r")).toBe("🔮");
  });

  it("should resolve partial matches", () => {
    // "claude-opus" normalizes to "claudeopus", matches "claude" prefix -> 🎹
    expect(resolveEmoji("claude-opus")).toBe("🎹");
    // "gpt-3.5-turbo" normalizes to "gpt35turbo", matches "gpt35" prefix -> 💡
    expect(resolveEmoji("gpt-3.5-turbo")).toBe("💡");
    expect(resolveEmoji("gemini-pro")).toBe("💎");
    expect(resolveEmoji("mistral-large")).toBe("🌪️");
  });

  it("should return default emoji for unknown providers", () => {
    expect(resolveEmoji("unknown-ai")).toBe("🤖");
    expect(resolveEmoji("random-text")).toBe("🤖");
    expect(resolveEmoji("xyz123")).toBe("🤖");
  });

  it("should handle numeric inputs", () => {
    expect(resolveEmoji(123)).toBe("🤖");
    expect(resolveEmoji(0)).toBe("🤖");
  });

  it("should handle aliases correctly", () => {
    expect(resolveEmoji("xai")).toBe("🦾");
    expect(resolveEmoji("google")).toBe("💎");
    expect(resolveEmoji("bard")).toBe("💎");
    expect(resolveEmoji("moonshot")).toBe("🌓");
  });
});

describe("mapMentionsToAiNames", () => {
  it("should map mentions to canonical AI names", () => {
    const mentions = ["claude", "gpt", "gemini", "perplexity"];
    const result = mapMentionsToAiNames(mentions);
    expect(result).toEqual(["claude-sonnet-4-5", "gpt-4o", "gemini", "sonar-pro"]);
  });

  it("should handle aliases correctly", () => {
    const mentions = ["anthropic", "openai", "google"];
    const result = mapMentionsToAiNames(mentions);
    expect(result).toEqual(["claude-sonnet-4-5", "gpt-4o", "gemini"]);
  });

  it("should remove duplicate mentions", () => {
    const mentions = ["claude", "anthropic", "claude"];
    const result = mapMentionsToAiNames(mentions);
    expect(result).toEqual(["claude-sonnet-4-5"]);
  });

  it("should handle empty array", () => {
    expect(mapMentionsToAiNames([])).toEqual([]);
  });

  it("should handle undefined input", () => {
    expect(mapMentionsToAiNames()).toEqual([]);
  });

  it("should preserve unknown mentions", () => {
    const mentions = ["claude", "unknown-ai", "gpt"];
    const result = mapMentionsToAiNames(mentions);
    expect(result).toEqual(["claude-sonnet-4-5", "unknown-ai", "gpt-4o"]);
  });

  it("should handle case variations", () => {
    const mentions = ["CLAUDE", "OpenAI", "GeMiNi"];
    const result = mapMentionsToAiNames(mentions);
    expect(result).toEqual(["claude-sonnet-4-5", "gpt-4o", "gemini"]);
  });

  it("should map display names with spaces", () => {
    const mentions = ["Claude 3.5 Haiku", "ChatGPT 5.1 Mini"];
    const result = mapMentionsToAiNames(mentions);
    expect(result).toEqual(["claude-3-5-haiku", "gpt-5.1-mini"]);
  });

  it("should handle null values in array", () => {
    const mentions = ["claude", null, "gpt", undefined];
    const result = mapMentionsToAiNames(mentions);
    expect(result).toContain("claude-sonnet-4-5");
    expect(result).toContain("gpt-4o");
  });

  it("should map all supported providers correctly", () => {
    const mentions = [
      "gpt4",
      "chatgpt",
      "grok",
      "xai",
      "bard",
      "command",
      "commandr",
      "z",
      "zai",
    ];
    const result = mapMentionsToAiNames(mentions);
    expect(result).toEqual([
      "gpt-4o",
      "gpt-5.1",
      "grok",
      "gemini",
      "cohere",
      "command-r",
      "z.ai",
    ]);
  });

  it("should handle mixed valid and invalid mentions", () => {
    const mentions = ["claude", "invalid1", "gpt", "invalid2", "gemini"];
    const result = mapMentionsToAiNames(mentions);
    expect(result).toEqual([
      "claude-sonnet-4-5",
      "invalid1",
      "gpt-4o",
      "invalid2",
      "gemini",
    ]);
  });

  it("should handle mentions without toLowerCase method", () => {
    const mentions = [123, "claude", true];
    const result = mapMentionsToAiNames(mentions);
    expect(result.length).toBeGreaterThan(0);
  });
});

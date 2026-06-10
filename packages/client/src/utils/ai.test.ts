import { describe, it, expect } from "vitest";
import { DEFAULT_AI_PARTICIPANTS } from "@/config/aiParticipants";
import { AI_MENTION_MAPPINGS } from "@/constants/chat.ts";
import { normalizeAlias, resolveEmoji, mapMentionsToAiNames } from "./ai.ts";

const resolveParticipantEmoji = (alias: string): string => {
  const participant = DEFAULT_AI_PARTICIPANTS.find(
    (entry) => entry.alias === alias,
  );
  if (!participant) {
    throw new Error(`Missing AI participant alias: ${alias}`);
  }
  return participant.emoji;
};

// Canonical flagship aliases derived from the mapping so tests survive model updates
const CLAUDE_FLAGSHIP = AI_MENTION_MAPPINGS.claude;
const GPT_FLAGSHIP = AI_MENTION_MAPPINGS.gpt;
const GEMINI_FLAGSHIP = AI_MENTION_MAPPINGS.gemini;
const GROK_FLAGSHIP = AI_MENTION_MAPPINGS.grok;

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
    const kimiEmoji = resolveParticipantEmoji("kimi-k2.5");
    const claudeEmoji = resolveParticipantEmoji(CLAUDE_FLAGSHIP);
    const gptEmoji = resolveParticipantEmoji(GPT_FLAGSHIP);
    expect(resolveEmoji("claude")).toBe(claudeEmoji);
    expect(resolveEmoji("anthropic")).toBe(claudeEmoji);
    expect(resolveEmoji("gpt")).toBe(gptEmoji);
    expect(resolveEmoji("gpt4")).toBe(resolveParticipantEmoji("gpt-4o"));
    expect(resolveEmoji("openai")).toBe(gptEmoji);
    expect(resolveEmoji("grok")).toBe(resolveParticipantEmoji(GROK_FLAGSHIP));
    expect(resolveEmoji("gemini")).toBe(resolveParticipantEmoji(GEMINI_FLAGSHIP));
    expect(resolveEmoji("mistral")).toBe("🌪️");
    expect(resolveEmoji("cohere")).toBe("⚓");
    expect(resolveEmoji("kimi")).toBe(kimiEmoji);
    expect(resolveEmoji("perplexity")).toBe("🔊");
    expect(resolveEmoji("qwen")).toBe("🐲");
  });

  it("should handle case insensitivity", () => {
    expect(resolveEmoji("CLAUDE")).toBe(resolveParticipantEmoji(CLAUDE_FLAGSHIP));
    expect(resolveEmoji("GPT")).toBe(resolveParticipantEmoji(GPT_FLAGSHIP));
    expect(resolveEmoji("Gemini")).toBe(resolveParticipantEmoji(GEMINI_FLAGSHIP));
  });

  it("should handle special characters in input", () => {
    expect(resolveEmoji("gpt-4")).toBe("🌍");
    expect(resolveEmoji("z.ai")).toBe("🔆");
    // "command-r" normalizes to "commandr", matches "command" prefix -> ⚓
    expect(resolveEmoji("command-r")).toBe("⚓");
  });

  it("should resolve partial matches", () => {
    // "claude-opus" normalizes to "claudeopus", matches "claude" prefix
    expect(resolveEmoji("claude-opus")).toBe(resolveParticipantEmoji(CLAUDE_FLAGSHIP));
    expect(resolveEmoji("gemini-pro")).toBe(resolveParticipantEmoji(GEMINI_FLAGSHIP));
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
    const kimiEmoji = resolveParticipantEmoji("kimi-k2.5");
    expect(resolveEmoji("xai")).toBe(resolveParticipantEmoji(GROK_FLAGSHIP));
    expect(resolveEmoji("google")).toBe(resolveParticipantEmoji(GEMINI_FLAGSHIP));
    expect(resolveEmoji("bard")).toBe(resolveParticipantEmoji(GEMINI_FLAGSHIP));
    expect(resolveEmoji("moonshot")).toBe(kimiEmoji);
  });
});

describe("mapMentionsToAiNames", () => {
  it("should map mentions to canonical AI names", () => {
    const mentions = ["claude", "gpt", "gemini", "perplexity", "qwen"];
    const result = mapMentionsToAiNames(mentions);
    expect(result).toEqual([
      CLAUDE_FLAGSHIP,
      GPT_FLAGSHIP,
      GEMINI_FLAGSHIP,
      "sonar-pro",
      "qwen3.6-max",
    ]);
  });

  it("should handle aliases correctly", () => {
    const mentions = ["anthropic", "openai", "google"];
    const result = mapMentionsToAiNames(mentions);
    expect(result).toEqual([
      CLAUDE_FLAGSHIP,
      GPT_FLAGSHIP,
      GEMINI_FLAGSHIP,
    ]);
  });

  it("should remove duplicate mentions", () => {
    const mentions = ["claude", "anthropic", "claude"];
    const result = mapMentionsToAiNames(mentions);
    expect(result).toEqual([CLAUDE_FLAGSHIP]);
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
    expect(result).toEqual([CLAUDE_FLAGSHIP, "unknown-ai", GPT_FLAGSHIP]);
  });

  it("should handle case variations", () => {
    const mentions = ["CLAUDE", "OpenAI", "GeMiNi"];
    const result = mapMentionsToAiNames(mentions);
    expect(result).toEqual([
      CLAUDE_FLAGSHIP,
      GPT_FLAGSHIP,
      GEMINI_FLAGSHIP,
    ]);
  });

  it("should map display names with spaces", () => {
    const mentions = ["Claude Haiku 4.5", "ChatGPT 5.1 Mini"];
    const result = mapMentionsToAiNames(mentions);
    expect(result).toEqual(["claude-haiku-4-5", "gpt-5-mini"]);
  });

  it("should handle null values in array", () => {
    const mentions = ["claude", null, "gpt", undefined];
    const result = mapMentionsToAiNames(mentions);
    expect(result).toContain(CLAUDE_FLAGSHIP);
    expect(result).toContain(GPT_FLAGSHIP);
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
      GPT_FLAGSHIP,
      GROK_FLAGSHIP,
      GEMINI_FLAGSHIP,
      "cohere",
      "command-r",
      "z.ai",
    ]);
  });

  it("should handle mixed valid and invalid mentions", () => {
    const mentions = ["claude", "invalid1", "gpt", "invalid2", "gemini"];
    const result = mapMentionsToAiNames(mentions);
    expect(result).toEqual([
      CLAUDE_FLAGSHIP,
      "invalid1",
      GPT_FLAGSHIP,
      "invalid2",
      GEMINI_FLAGSHIP,
    ]);
  });

  it("should handle mentions without toLowerCase method", () => {
    const mentions = [123, "claude", true];
    const result = mapMentionsToAiNames(mentions);
    expect(result.length).toBeGreaterThan(0);
  });
});

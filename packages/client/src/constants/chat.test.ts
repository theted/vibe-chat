import { describe, it, expect, afterEach } from "vitest";
import { DEFAULT_AI_PARTICIPANTS } from "@/config/aiParticipants";
import { SERVER_URL, AI_EMOJI_LOOKUP, AI_MENTION_MAPPINGS } from "./chat.ts";

const resolveParticipantEmoji = (alias: string): string => {
  const participant = DEFAULT_AI_PARTICIPANTS.find(
    (entry) => entry.alias === alias,
  );
  if (!participant) {
    throw new Error(`Missing AI participant alias: ${alias}`);
  }
  return participant.emoji;
};

const meta = import.meta as { env: Record<string, string> };

describe("chat constants", () => {
  describe("SERVER_URL", () => {
    const originalEnv = { ...meta.env };

    afterEach(() => {
      // Restore original env
      meta.env = { ...originalEnv };
    });

    it("should have a default SERVER_URL", () => {
      expect(SERVER_URL).toBeDefined();
      expect(typeof SERVER_URL).toBe("string");
    });

    it("should use localhost as default", () => {
      expect(SERVER_URL).toContain("localhost");
    });

    it("should include port 3001", () => {
      expect(SERVER_URL).toContain("3001");
    });

    it("should be a valid URL format", () => {
      expect(() => new URL(SERVER_URL)).not.toThrow();
    });
  });

  describe("AI_EMOJI_LOOKUP", () => {
    it("should be defined and be an object", () => {
      expect(AI_EMOJI_LOOKUP).toBeDefined();
      expect(typeof AI_EMOJI_LOOKUP).toBe("object");
    });

    it("should contain entries for major AI providers", () => {
      const requiredProviders = [
        "claude",
        "gpt",
        "openai",
        "gemini",
        "grok",
        "mistral",
        "cohere",
        "perplexity",
        "qwen",
      ];
      requiredProviders.forEach((provider) => {
        expect(AI_EMOJI_LOOKUP).toHaveProperty(provider);
      });
    });

    // Derive expected emojis from the canonical mapping so these tests
    // survive flagship model updates without manual edits.
    it("should map Claude variants to the flagship participant emoji", () => {
      const expected = resolveParticipantEmoji(AI_MENTION_MAPPINGS.claude);
      expect(AI_EMOJI_LOOKUP.claude).toBe(expected);
      expect(AI_EMOJI_LOOKUP.anthropic).toBe(expected);
    });

    it("should map GPT variants to the expected emoji", () => {
      const expected = resolveParticipantEmoji(AI_MENTION_MAPPINGS.gpt);
      expect(AI_EMOJI_LOOKUP.gpt).toBe(expected);
      expect(AI_EMOJI_LOOKUP.openai).toBe(expected);
      expect(AI_EMOJI_LOOKUP.gpt4).toBe(resolveParticipantEmoji("gpt-4o"));
    });

    it("should map Grok/X.AI to the flagship participant emoji", () => {
      const expected = resolveParticipantEmoji(AI_MENTION_MAPPINGS.grok);
      expect(AI_EMOJI_LOOKUP.grok).toBe(expected);
      expect(AI_EMOJI_LOOKUP.xai).toBe(expected);
    });

    it("should map Gemini/Google to the flagship participant emoji", () => {
      const expected = resolveParticipantEmoji(AI_MENTION_MAPPINGS.gemini);
      expect(AI_EMOJI_LOOKUP.gemini).toBe(expected);
      expect(AI_EMOJI_LOOKUP.google).toBe(expected);
      expect(AI_EMOJI_LOOKUP.bard).toBe(expected);
    });

    it("should map Cohere variants to anchor emoji", () => {
      expect(AI_EMOJI_LOOKUP.cohere).toBe("⚓");
      expect(AI_EMOJI_LOOKUP.command).toBe("⚓");
      expect(AI_EMOJI_LOOKUP.commandr).toBe("⚓");
    });

    it("should map Mistral to tornado emoji", () => {
      expect(AI_EMOJI_LOOKUP.mistral).toBe("🌪️");
    });

    it("should map Kimi/Moonshot to moon emojis", () => {
      const kimiEmoji = resolveParticipantEmoji("kimi-k2.5");
      expect(AI_EMOJI_LOOKUP.kimi).toBe(kimiEmoji);
      expect(AI_EMOJI_LOOKUP.moonshot).toBe(kimiEmoji);
    });

    it("should map Z.AI variants to brightness emoji", () => {
      expect(AI_EMOJI_LOOKUP.zai).toBe("🔆");
      expect(AI_EMOJI_LOOKUP.z).toBe("🔆");
      expect(AI_EMOJI_LOOKUP["z.ai"]).toBe("🔆");
    });

    it("should only contain emoji values", () => {
      Object.values(AI_EMOJI_LOOKUP).forEach((value) => {
        expect(typeof value).toBe("string");
        expect(value.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("should have unique keys", () => {
      const keys = Object.keys(AI_EMOJI_LOOKUP);
      const uniqueKeys = [...new Set(keys)];
      expect(keys.length).toBe(uniqueKeys.length);
    });
  });

  describe("AI_MENTION_MAPPINGS", () => {
    it("should be defined and be an object", () => {
      expect(AI_MENTION_MAPPINGS).toBeDefined();
      expect(typeof AI_MENTION_MAPPINGS).toBe("object");
    });

    it("should contain bare provider aliases for major AI providers", () => {
      const requiredAliases = [
        "claude",
        "gpt",
        "grok",
        "gemini",
        "cohere",
        "mistral",
        "perplexity",
        "qwen",
      ];
      requiredAliases.forEach((alias) => {
        expect(AI_MENTION_MAPPINGS).toHaveProperty(alias);
      });
    });

    it("should map provider aliases to active participant aliases", () => {
      // Flagship mappings must always point at a currently active participant —
      // this is the invariant that catches stale model updates.
      const activeAliases = DEFAULT_AI_PARTICIPANTS.filter(
        (participant) => participant.status === "active",
      ).map((participant) => participant.alias);

      ["claude", "anthropic", "gpt", "openai", "grok", "xai", "gemini", "google"].forEach(
        (alias) => {
          expect(activeAliases).toContain(AI_MENTION_MAPPINGS[alias]);
        },
      );
    });

    it("should keep provider alias pairs in sync", () => {
      expect(AI_MENTION_MAPPINGS.anthropic).toBe(AI_MENTION_MAPPINGS.claude);
      expect(AI_MENTION_MAPPINGS.openai).toBe(AI_MENTION_MAPPINGS.gpt);
      expect(AI_MENTION_MAPPINGS.chatgpt).toBe(AI_MENTION_MAPPINGS.gpt);
      expect(AI_MENTION_MAPPINGS.xai).toBe(AI_MENTION_MAPPINGS.grok);
      expect(AI_MENTION_MAPPINGS.google).toBe(AI_MENTION_MAPPINGS.gemini);
      expect(AI_MENTION_MAPPINGS.bard).toBe(AI_MENTION_MAPPINGS.gemini);
      expect(AI_MENTION_MAPPINGS.gpt4).toBe("gpt-4o");
      expect(AI_MENTION_MAPPINGS["gpt-4"]).toBe("gpt-4o");
    });

    it("should map Cohere aliases to cohere", () => {
      expect(AI_MENTION_MAPPINGS.command).toBe("cohere");
      expect(AI_MENTION_MAPPINGS.commandr).toBe("cohere");
      expect(AI_MENTION_MAPPINGS.cohere).toBe("cohere");
    });

    it("should map Mistral correctly", () => {
      expect(AI_MENTION_MAPPINGS.mistral).toBe("mistral");
    });

    it("should map Z.AI aliases to z.ai", () => {
      expect(AI_MENTION_MAPPINGS["z.ai"]).toBe("z.ai");
      expect(AI_MENTION_MAPPINGS.z).toBe("z.ai");
      expect(AI_MENTION_MAPPINGS.zai).toBe("z.ai");
    });

    it("should have all lowercase keys", () => {
      Object.keys(AI_MENTION_MAPPINGS).forEach((key) => {
        expect(key).toBe(key.toLowerCase());
      });
    });

    it("should map aliases to canonical names", () => {
      Object.entries(AI_MENTION_MAPPINGS).forEach(([, canonical]) => {
        expect(typeof canonical).toBe("string");
        expect(canonical.length).toBeGreaterThan(0);
      });
    });

    it("should have consistent mappings with emoji lookup", () => {
      const canonicalNames = [...new Set(Object.values(AI_MENTION_MAPPINGS))];
      canonicalNames.forEach((name) => {
        const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, "");
        const hasEmoji = Object.keys(AI_EMOJI_LOOKUP).some((key) => {
          const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
          return (
            normalizedName.includes(normalizedKey) ||
            normalizedKey.includes(normalizedName)
          );
        });
        expect(hasEmoji).toBe(true);
      });
    });
  });

  describe("constants integration", () => {
    it("should have corresponding emoji for each mention mapping", () => {
      const uniqueMappings = [...new Set(Object.values(AI_MENTION_MAPPINGS))];
      uniqueMappings.forEach((mapping) => {
        const normalized = mapping.toLowerCase().replace(/[^a-z0-9]/g, "");
        const hasCorrespondingEmoji = Object.keys(AI_EMOJI_LOOKUP).some(
          (emojiKey) => {
            const normalizedKey = emojiKey
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "");
            return (
              normalized.includes(normalizedKey) ||
              normalizedKey.includes(normalized)
            );
          },
        );
        expect(hasCorrespondingEmoji).toBe(true);
      });
    });

    it("should not have empty or null values", () => {
      Object.values(AI_EMOJI_LOOKUP).forEach((value) => {
        expect(value).toBeTruthy();
      });
      Object.values(AI_MENTION_MAPPINGS).forEach((value) => {
        expect(value).toBeTruthy();
      });
    });
  });
});

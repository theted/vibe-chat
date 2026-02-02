import { describe, it, expect, afterEach } from "vitest";
import { SERVER_URL, AI_EMOJI_LOOKUP, AI_MENTION_MAPPINGS } from "./chat.ts";

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

    it("should map Claude variants to music emoji", () => {
      expect(AI_EMOJI_LOOKUP.claude).toBe("🎹");
      expect(AI_EMOJI_LOOKUP.anthropic).toBe("🎹");
    });

    it("should map GPT variants to brain emoji", () => {
      expect(AI_EMOJI_LOOKUP.gpt).toBe("🧠");
      expect(AI_EMOJI_LOOKUP.gpt4).toBe("🧠");
      expect(AI_EMOJI_LOOKUP.gpt35).toBe("💡");
      expect(AI_EMOJI_LOOKUP.openai).toBe("🧠");
    });

    it("should map Grok/X.AI to mechanical arm emoji", () => {
      expect(AI_EMOJI_LOOKUP.grok).toBe("🦾");
      expect(AI_EMOJI_LOOKUP.xai).toBe("🦾");
    });

    it("should map Gemini/Google to diamond emoji", () => {
      expect(AI_EMOJI_LOOKUP.gemini).toBe("💎");
      expect(AI_EMOJI_LOOKUP.google).toBe("💎");
      expect(AI_EMOJI_LOOKUP.bard).toBe("💎");
    });

    it("should map Cohere variants to crystal ball emoji", () => {
      expect(AI_EMOJI_LOOKUP.cohere).toBe("🔮");
      expect(AI_EMOJI_LOOKUP.command).toBe("🔮");
      expect(AI_EMOJI_LOOKUP.commandr).toBe("🔮");
    });

    it("should map Mistral to tornado emoji", () => {
      expect(AI_EMOJI_LOOKUP.mistral).toBe("🌪️");
    });

    it("should map Kimi/Moonshot to moon emojis", () => {
      expect(AI_EMOJI_LOOKUP.kimi).toBe("🌕");
      expect(AI_EMOJI_LOOKUP.moonshot).toBe("🌕");
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

    it("should contain mappings for major AI providers", () => {
      const requiredProviders = [
        "claude-sonnet-4-5",
        "gpt-4o",
        "grok",
        "gemini",
        "cohere",
        "mistral",
        "sonar-pro",
        "qwen-turbo",
      ];
      const mappingValues = Object.values(AI_MENTION_MAPPINGS);
      requiredProviders.forEach((provider) => {
        expect(mappingValues).toContain(provider);
      });
    });

    it("should map Claude aliases to claude-sonnet-4-5", () => {
      expect(AI_MENTION_MAPPINGS.claude).toBe("claude-sonnet-4-5");
      expect(AI_MENTION_MAPPINGS.anthropic).toBe("claude-sonnet-4-5");
    });

    it("should map GPT aliases to gpt-4o", () => {
      expect(AI_MENTION_MAPPINGS.gpt).toBe("gpt-4o");
      expect(AI_MENTION_MAPPINGS.gpt4).toBe("gpt-4o");
      expect(AI_MENTION_MAPPINGS["gpt-4"]).toBe("gpt-4o");
      expect(AI_MENTION_MAPPINGS.openai).toBe("gpt-4o");
      expect(AI_MENTION_MAPPINGS.chatgpt).toBe("gpt-5.1");
    });

    it("should map Grok aliases correctly", () => {
      expect(AI_MENTION_MAPPINGS.grok).toBe("grok");
      expect(AI_MENTION_MAPPINGS.xai).toBe("grok");
    });

    it("should map Gemini aliases correctly", () => {
      expect(AI_MENTION_MAPPINGS.gemini).toBe("gemini");
      expect(AI_MENTION_MAPPINGS.google).toBe("gemini");
      expect(AI_MENTION_MAPPINGS.bard).toBe("gemini");
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

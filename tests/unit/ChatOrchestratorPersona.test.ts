import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { AI_PROVIDERS, ChatOrchestrator } from "@ai-chat/core";

describe("ChatOrchestrator persona prompt behavior", () => {
  let orchestrator: ChatOrchestrator | null = null;
  const originalPersonaFlag = process.env.AI_CHAT_ENABLE_PERSONAS;

  afterEach(() => {
    if (orchestrator) {
      orchestrator.cleanup();
      orchestrator = null;
    }
    if (originalPersonaFlag === undefined) {
      delete process.env.AI_CHAT_ENABLE_PERSONAS;
    } else {
      process.env.AI_CHAT_ENABLE_PERSONAS = originalPersonaFlag;
    }
  });

  it("injects persona details when the personas flag is enabled", () => {
    process.env.AI_CHAT_ENABLE_PERSONAS = "true";
    orchestrator = new ChatOrchestrator({
      minBackgroundDelay: 1_000_000,
      maxBackgroundDelay: 1_000_000,
    });

    const aiService = {
      name: "OpenAI",
      service: {
        config: {
          provider: AI_PROVIDERS.OPENAI,
        },
      },
    };

    const prompt = orchestrator.createEnhancedSystemPrompt(aiService, [], true);

    assert.ok(
      prompt.includes("PERSONALITY CONTEXT"),
      "expected persona context header in prompt"
    );
    assert.ok(
      prompt.includes(AI_PROVIDERS.OPENAI.persona?.basePersonality || ""),
      "expected persona base personality in prompt"
    );
  });

  it("skips persona details when the personas flag is disabled", () => {
    process.env.AI_CHAT_ENABLE_PERSONAS = "false";
    orchestrator = new ChatOrchestrator({
      minBackgroundDelay: 1_000_000,
      maxBackgroundDelay: 1_000_000,
    });

    const aiService = {
      name: "OpenAI",
      service: {
        config: {
          provider: AI_PROVIDERS.OPENAI,
        },
      },
    };

    const prompt = orchestrator.createEnhancedSystemPrompt(aiService, [], true);

    assert.ok(
      !prompt.includes("PERSONALITY CONTEXT"),
      "did not expect persona context header in prompt"
    );
  });

  it("injects persona details when only providerKey is available", () => {
    process.env.AI_CHAT_ENABLE_PERSONAS = "true";
    orchestrator = new ChatOrchestrator({
      minBackgroundDelay: 1_000_000,
      maxBackgroundDelay: 1_000_000,
    });

    const aiService = {
      name: "OpenAI",
      config: {
        providerKey: "OPENAI",
      },
    };

    const prompt = orchestrator.createEnhancedSystemPrompt(aiService, [], true);

    assert.ok(
      prompt.includes("PERSONALITY CONTEXT"),
      "expected persona context header in prompt"
    );
    assert.ok(
      prompt.includes(AI_PROVIDERS.OPENAI.persona?.basePersonality || ""),
      "expected persona base personality in prompt"
    );
  });
});

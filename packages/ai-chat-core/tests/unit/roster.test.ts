import { describe, expect, it } from "bun:test";
import { ContextManager } from "@/orchestrator/ContextManager.js";
import { SYSTEM_PROMPT } from "@/orchestrator/constants.js";
import type { ContextMessage } from "@/types/orchestrator.js";
import type { OrchestratorAIService } from "@/utils/orchestrator/aiLookup.js";
import { createEnhancedSystemPrompt } from "@/utils/orchestrator/promptBuilder.js";

const makeAI = (id: string, displayName: string, alias: string) => ({
  id,
  name: displayName,
  displayName,
  alias,
  normalizedAlias: alias,
});

const self = makeAI("self_ai", "SelfAI", "selfai");
const claude = makeAI("anthropic_claude", "Claude", "claude");
const gemini = makeAI("google_gemini", "Gemini", "gemini");
const grok = makeAI("xai_grok", "Grok", "grok");

const aiServices = new Map<string, OrchestratorAIService>(
  [self, claude, gemini, grok].map((ai) => [ai.id, ai]),
);

const aiMessage = (ai: typeof claude, content = "hello"): ContextMessage => ({
  sender: ai.displayName,
  senderType: "ai",
  displayName: ai.displayName,
  aiId: ai.id,
  content,
});

const rosterLine = (prompt: string, label: string) =>
  prompt.split("\n").find((line) => line.startsWith(label)) ?? "";

describe("system prompt roster activity", () => {
  it("lists AIs that posted as active and the rest as not yet posted", () => {
    const prompt = createEnhancedSystemPrompt(
      self,
      [aiMessage(claude), { sender: "Ada", senderType: "user", content: "hi" }],
      true,
      aiServices,
    );

    expect(prompt).toContain(SYSTEM_PROMPT.ROSTER_HEADER);
    expect(rosterLine(prompt, SYSTEM_PROMPT.ROSTER_ACTIVE)).toBe(
      `${SYSTEM_PROMPT.ROSTER_ACTIVE} Claude (@claude)`,
    );
    expect(rosterLine(prompt, SYSTEM_PROMPT.ROSTER_SILENT)).toBe(
      `${SYSTEM_PROMPT.ROSTER_SILENT} Gemini (@gemini), Grok (@grok)`,
    );
  });

  it("omits the active line when no other AI has posted", () => {
    const prompt = createEnhancedSystemPrompt(self, [], true, aiServices);

    expect(rosterLine(prompt, SYSTEM_PROMPT.ROSTER_ACTIVE)).toBe("");
    expect(rosterLine(prompt, SYSTEM_PROMPT.ROSTER_SILENT)).toContain(
      "Claude (@claude), Gemini (@gemini), Grok (@grok)",
    );
  });

  it("omits the silent line when every other AI has posted", () => {
    const prompt = createEnhancedSystemPrompt(
      self,
      [aiMessage(claude), aiMessage(gemini), aiMessage(grok)],
      true,
      aiServices,
    );

    expect(rosterLine(prompt, SYSTEM_PROMPT.ROSTER_SILENT)).toBe("");
  });

  it("does not count a human whose name matches a model", () => {
    const prompt = createEnhancedSystemPrompt(
      self,
      [{ sender: "Claude", senderType: "user", content: "I'm a person" }],
      true,
      aiServices,
    );

    expect(rosterLine(prompt, SYSTEM_PROMPT.ROSTER_ACTIVE)).toBe("");
  });

  it("does not list the prompted AI itself, even when it has posted", () => {
    const prompt = createEnhancedSystemPrompt(
      self,
      [aiMessage(self)],
      true,
      aiServices,
    );

    expect(rosterLine(prompt, SYSTEM_PROMPT.ROSTER_ACTIVE)).toBe("");
    expect(rosterLine(prompt, SYSTEM_PROMPT.ROSTER_SILENT)).not.toContain(
      "@selfai",
    );
  });

  it("counts AIs whose messages only survive in the digest", () => {
    const manager = new ContextManager(1);
    manager.addMessage(aiMessage(gemini, "an old thought"));
    manager.addMessage({ sender: "Ada", senderType: "user", content: "hi" });

    const prompt = createEnhancedSystemPrompt(
      self,
      manager.getContext(),
      true,
      aiServices,
      {
        conversationDigest: manager.getConversationDigest(),
        digestSpeakers: manager.getDigestSpeakers(),
      },
    );

    expect(rosterLine(prompt, SYSTEM_PROMPT.ROSTER_ACTIVE)).toBe(
      `${SYSTEM_PROMPT.ROSTER_ACTIVE} Gemini (@gemini)`,
    );
  });

  it("scopes the roster to the room's AIs", () => {
    const prompt = createEnhancedSystemPrompt(
      self,
      [aiMessage(claude)],
      true,
      aiServices,
      { roomAIs: [self, gemini] },
    );

    expect(prompt).not.toContain("@claude");
    expect(rosterLine(prompt, SYSTEM_PROMPT.ROSTER_SILENT)).toBe(
      `${SYSTEM_PROMPT.ROSTER_SILENT} Gemini (@gemini)`,
    );
  });
});

describe("ContextManager digest speakers", () => {
  it("records who wrote each digest line, per room", () => {
    const manager = new ContextManager(1);
    manager.addMessage({ ...aiMessage(claude), roomId: "room-a" });
    manager.addMessage({ ...aiMessage(grok), roomId: "room-a" });
    manager.addMessage({ ...aiMessage(gemini), roomId: "room-b" });

    expect(manager.getDigestSpeakers("room-a").map((s) => s.aiId)).toEqual([
      claude.id,
    ]);
    expect(manager.getDigestSpeakers("room-b")).toEqual([]);
  });
});

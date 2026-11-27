import { describe, expect, it } from "bun:test";
import { ChatOrchestrator } from "@/orchestrator/ChatOrchestrator.js";
import { SYSTEM_PROMPT } from "@/orchestrator/constants.js";
import type { OrchestratorAIService } from "@/utils/orchestrator/aiLookup.js";
import {
  createEnhancedSystemPrompt,
  type ChatAssistantPromptInfo,
} from "@/utils/orchestrator/promptBuilder.js";

const self = {
  id: "self_ai",
  name: "SelfAI",
  displayName: "SelfAI",
  alias: "selfai",
  normalizedAlias: "selfai",
};
const aiServices = new Map<string, OrchestratorAIService>([[self.id, self]]);

const buildPrompt = (chatAssistant?: ChatAssistantPromptInfo) =>
  createEnhancedSystemPrompt(self, [], true, aiServices, { chatAssistant });

describe("room contract in the system prompt", () => {
  it("frames the model as one participant in a shared multi-AI chat", () => {
    const prompt = buildPrompt();
    expect(prompt).toStartWith(
      "You are SelfAI (@selfai), one participant in a shared group chat where several AI models and humans talk together.",
    );
    expect(prompt).toContain("Use @mentions intentionally");
  });
});

describe("@Chat section in the system prompt", () => {
  it("is left out unless @Chat is available", () => {
    expect(buildPrompt()).not.toContain("@Chat");
    expect(buildPrompt({ available: false })).not.toContain("@Chat");
  });

  it("names what @Chat is for and asks for one question, then waiting", () => {
    const prompt = buildPrompt({ available: true, canFileIssues: true });

    expect(prompt).toContain(SYSTEM_PROMPT.CHAT_ASSISTANT(true));
    expect(prompt).toContain("code and config");
    expect(prompt).toContain("GitHub issues");
    expect(prompt).toContain("files a new one when someone explicitly asks");
    expect(prompt).toContain("web");
    expect(prompt).toContain("optional, but encouraged");
    expect(prompt).toContain("never repeat a question");
  });

  it("says @Chat can't file issues where filing is off", () => {
    const prompt = buildPrompt({ available: true, canFileIssues: false });

    expect(prompt).toContain("it can't file issues from a private chat");
    expect(prompt).not.toContain("files a new one");
  });

  it("stays the same from turn to turn", () => {
    const info = { available: true, canFileIssues: true };
    expect(buildPrompt(info)).toBe(buildPrompt(info));
  });
});

describe("ChatOrchestrator.getChatAssistantInfo", () => {
  it("reports no @Chat until the server sets one", () => {
    const orchestrator = new ChatOrchestrator();
    expect(orchestrator.getChatAssistantInfo("default")).toEqual({
      available: false,
    });
  });

  it("turns issue filing off in private rooms", () => {
    const orchestrator = new ChatOrchestrator();
    orchestrator.setChatAssistant({ canFileIssues: true });

    expect(orchestrator.getChatAssistantInfo("default")).toEqual({
      available: true,
      canFileIssues: true,
    });
    expect(
      orchestrator.getChatAssistantInfo("private:ada:anthropic_claude"),
    ).toEqual({ available: true, canFileIssues: false });
  });

  it("keeps issue filing off when the server can't file issues", () => {
    const orchestrator = new ChatOrchestrator();
    orchestrator.setChatAssistant({ canFileIssues: false });
    expect(orchestrator.getChatAssistantInfo("default").canFileIssues).toBe(
      false,
    );

    orchestrator.setChatAssistant(null);
    expect(orchestrator.getChatAssistantInfo("default").available).toBe(false);
  });
});

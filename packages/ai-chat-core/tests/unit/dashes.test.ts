/**
 * Em dash cleanup (issue #290): the helper on its own, and a model's raw
 * reply going through ResponseGenerator to the message it posts.
 */

import { describe, expect, it } from "bun:test";
import type { AIRegistry } from "@/orchestrator/AIRegistry.js";
import { ContextManager } from "@/orchestrator/ContextManager.js";
import { ResponseGenerator } from "@/orchestrator/ResponseGenerator.js";
import type { IAIService } from "@/types/index.js";
import type { ContextMessage } from "@/types/orchestrator.js";
import { replaceLongDashes } from "@/utils/orchestrator/dashes.js";
import type { OrchestratorAIService } from "@/utils/orchestrator/aiLookup.js";

describe("replaceLongDashes", () => {
  it("turns an em dash between words into a spaced hyphen", () => {
    expect(replaceLongDashes("a gem—it's not just the beer")).toBe(
      "a gem - it's not just the beer",
    );
  });

  it("collapses the spaces around an em dash", () => {
    expect(replaceLongDashes("I accept — though the victory")).toBe(
      "I accept - though the victory",
    );
  });

  it("treats a spaced en dash as a dash", () => {
    expect(replaceLongDashes("Fair point – but consider")).toBe(
      "Fair point - but consider",
    );
  });

  it("keeps an en dash range between digits as a plain hyphen", () => {
    expect(replaceLongDashes("from 1990–2000, pages 4–7")).toBe(
      "from 1990-2000, pages 4-7",
    );
  });

  it("replaces a run of dashes once", () => {
    expect(replaceLongDashes("wait——what")).toBe("wait - what");
  });

  it("drops a dash that opens the reply", () => {
    expect(replaceLongDashes("— fair point")).toBe("fair point");
  });

  it("doesn't pad a dash at a line edge", () => {
    expect(replaceLongDashes("Be yourself.\n— Oscar Wilde")).toBe(
      "Be yourself.\n- Oscar Wilde",
    );
    expect(replaceLongDashes("I was going to—\nnever mind")).toBe(
      "I was going to -\nnever mind",
    );
    expect(replaceLongDashes("I was going to—")).toBe("I was going to -");
  });

  it("leaves inline code and fenced blocks alone", () => {
    expect(replaceLongDashes('Use `"—"` here—or not')).toBe(
      'Use `"—"` here - or not',
    );
    expect(
      replaceLongDashes("Like this—\n```js\nconst dash = '—';\n```\ndone—ok"),
    ).toBe("Like this -\n```js\nconst dash = '—';\n```\ndone - ok");
  });

  it("treats an unclosed fence as code to the end", () => {
    expect(replaceLongDashes("See—\n```\nconst dash = '—';")).toBe(
      "See -\n```\nconst dash = '—';",
    );
  });

  it("returns text without long dashes unchanged", () => {
    const text = "Plain - text with a hyphen-joined word, @glm-5-3-flashx.";
    expect(replaceLongDashes(text)).toBe(text);
  });
});

describe("ResponseGenerator dash cleanup", () => {
  it("posts a reply without the em dashes the model wrote", async () => {
    const service = {
      generateResponse: async () =>
        "The Santorini rule is a gem—it protects working donkeys — honestly.",
      getModel: () => "test-model",
    } as unknown as IAIService;
    const ai: OrchestratorAIService = {
      id: "test_ai",
      name: "Tester",
      displayName: "Tester",
      alias: "tester",
      normalizedAlias: "tester",
      isActive: true,
      service,
    };
    const contextManager = new ContextManager();
    contextManager.addMessage({
      id: "m1",
      senderType: "user",
      sender: "Ted",
      displayName: "Ted",
      content: "what about the donkeys?",
      roomId: "default",
    });

    const posted: ContextMessage[] = [];
    const generator = new ResponseGenerator({
      registry: { services: new Map([[ai.id, ai]]) } as unknown as AIRegistry,
      contextManager,
      emit: () => undefined,
      enqueueMessage: (message) => posted.push(message),
      onResponseComplete: () => undefined,
      canSpeak: () => true,
      claimTurn: () => true,
      getFatigue: () => 0,
      isDirectOnly: () => true,
      isPrivateGroup: () => false,
      getRoomAIs: () => [ai],
      isVerbose: () => false,
    });

    await generator.generate("test_ai", "default");

    expect(posted.map((message) => message.content)).toEqual([
      "The Santorini rule is a gem - it protects working donkeys - honestly.",
    ]);
  });
});

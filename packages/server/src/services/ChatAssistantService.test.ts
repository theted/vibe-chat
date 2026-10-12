import { describe, expect, test } from "bun:test";

import { ChatAssistantService } from "./ChatAssistantService";

describe("ChatAssistantService.extractQuestion", () => {
  const service = new ChatAssistantService();

  test.each([
    ["@Chat how do mentions work?", "how do mentions work?"],
    ["Hey @Chat, how does X work?", "Hey how does X work?"],
    ["how does routing work, @Chat?", "how does routing work?"],
    ["@chat: which models exist?", "which models exist?"],
    ["Sure thing! @Chat, how many messages?", "Sure thing! how many messages?"],
  ])("%s", (content, expected) => {
    expect(service.extractQuestion(content)).toBe(expected);
  });

  test("returns null for a bare mention or no mention", () => {
    expect(service.extractQuestion("@Chat")).toBeNull();
    expect(service.extractQuestion("@ChatGPT what do you think?")).toBeNull();
  });
});

describe("ChatAssistantService.shouldHandle", () => {
  test("ignores mentions until the assistant is initialised", () => {
    expect(new ChatAssistantService().shouldHandle("@Chat hi")).toBe(false);
  });
});

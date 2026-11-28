import { describe, expect, it } from "vitest";
import { getMentionableUsernames } from "./mentionablePeople";
import type { Message } from "@/types";

const makeMessage = (overrides: Partial<Message>): Message => ({
  id: `message-${overrides.sender}`,
  senderType: "user",
  sender: "Skylar",
  content: "hi",
  timestamp: 1,
  ...overrides,
});

describe("getMentionableUsernames", () => {
  it("lists room participants, then people who wrote loaded messages", () => {
    const messages = [
      makeMessage({ sender: "Theted" }),
      makeMessage({ sender: "Skylar" }),
    ];
    expect(getMentionableUsernames([{ username: "Skylar" }], messages)).toEqual(
      ["Skylar", "Theted"],
    );
  });

  it("skips AI and system senders and repeats in another case", () => {
    const messages = [
      makeMessage({ senderType: "ai", sender: "Claude Opus 5.5" }),
      makeMessage({ senderType: "system", sender: "system" }),
      makeMessage({ sender: "skylar" }),
    ];
    expect(getMentionableUsernames([{ username: "Skylar" }], messages)).toEqual(
      ["Skylar"],
    );
  });

  it("copes with nothing loaded yet", () => {
    expect(getMentionableUsernames()).toEqual([]);
  });
});

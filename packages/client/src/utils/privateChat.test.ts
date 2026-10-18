import { describe, it, expect } from "vitest";
import { MAX_PRIVATE_ROOM_AIS } from "@ai-chat/ai-configs";
import { getModelPickHint, getModelSelection } from "./privateChat";

describe("getModelSelection", () => {
  it("starts a 1-1 chat from the main room", () => {
    expect(getModelSelection("OPUS", "Opus", null)).toEqual({
      isMember: false,
      canSelect: true,
      title: "Start private chat with Opus",
    });
  });

  it("adds a model to a private chat with room for it", () => {
    const roster = { memberIds: ["GPT"], isFull: false };
    expect(getModelSelection("OPUS", "Opus", roster)).toMatchObject({
      isMember: false,
      canSelect: true,
      title: "Add Opus to this chat",
    });
  });

  it("offers to remove a member of a group, but not the last model", () => {
    expect(
      getModelSelection("OPUS", "Opus", {
        memberIds: ["GPT", "OPUS"],
        isFull: false,
      }).title,
    ).toBe("Remove Opus from this chat");
    expect(
      getModelSelection("OPUS", "Opus", { memberIds: ["OPUS"], isFull: false })
        .title,
    ).toBe("You are privately chatting with Opus");
  });

  it("can't add to a full chat", () => {
    const roster = { memberIds: ["A", "B", "C", "D", "E"], isFull: true };
    expect(getModelSelection("OPUS", "Opus", roster).canSelect).toBe(false);
    expect(getModelSelection("A", "A", roster).canSelect).toBe(true);
  });
});

describe("getModelPickHint", () => {
  it("says what a pick does in each room", () => {
    expect(getModelPickHint(null)).toBe("Pick one to talk privately.");
    expect(getModelPickHint({ memberIds: ["A"], isFull: false })).toContain(
      `up to ${MAX_PRIVATE_ROOM_AIS}`,
    );
    expect(getModelPickHint({ memberIds: [], isFull: true })).toContain("full");
  });
});

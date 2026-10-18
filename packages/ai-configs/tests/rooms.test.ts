import { describe, it, expect } from "bun:test";

import {
  MAX_PRIVATE_ROOM_AIS,
  buildPrivateRoomId,
  getPrivateRoomAiIds,
  getPrivateRoomOwner,
} from "../src/rooms.js";

describe("buildPrivateRoomId", () => {
  it("keeps the 1-1 format so existing private rooms keep their history", () => {
    expect(buildPrivateRoomId("ada", "OPENAI_GPT6_SOL")).toBe(
      "private:ada:OPENAI_GPT6_SOL",
    );
    expect(buildPrivateRoomId("ada", ["OPENAI_GPT6_SOL"])).toBe(
      "private:ada:OPENAI_GPT6_SOL",
    );
  });

  it("gives the same set of AIs the same room, whatever the order", () => {
    const room = buildPrivateRoomId("ada", ["XAI_GROK", "ANTHROPIC_OPUS"]);
    expect(room).toBe("private:ada:ANTHROPIC_OPUS+XAI_GROK");
    expect(
      buildPrivateRoomId("ada", ["ANTHROPIC_OPUS", " XAI_GROK ", "XAI_GROK"]),
    ).toBe(room);
  });

  it("returns null without a user, without AIs, or past the cap", () => {
    expect(buildPrivateRoomId(" ", "OPENAI_GPT6_SOL")).toBeNull();
    expect(buildPrivateRoomId("ada", [])).toBeNull();
    expect(buildPrivateRoomId("ada", ["", " "])).toBeNull();
    const tooMany = Array.from(
      { length: MAX_PRIVATE_ROOM_AIS + 1 },
      (_, index) => `AI_${index}`,
    );
    expect(buildPrivateRoomId("ada", tooMany)).toBeNull();
  });
});

describe("getPrivateRoomAiIds", () => {
  it("reads one AI or several out of a private room id", () => {
    expect(
      getPrivateRoomAiIds("private:ada:ANTHROPIC_CLAUDE_OPUS_5_5"),
    ).toEqual(["ANTHROPIC_CLAUDE_OPUS_5_5"]);
    expect(getPrivateRoomAiIds("private:ada:ANTHROPIC_OPUS+XAI_GROK")).toEqual([
      "ANTHROPIC_OPUS",
      "XAI_GROK",
    ]);
  });

  it("keeps colons inside an AI id", () => {
    expect(getPrivateRoomAiIds("private:ada:vendor:model+OTHER")).toEqual([
      "vendor:model",
      "OTHER",
    ]);
  });

  it("returns [] for ordinary rooms and malformed ids", () => {
    expect(getPrivateRoomAiIds("default")).toEqual([]);
    expect(getPrivateRoomAiIds("private:ada")).toEqual([]);
    expect(getPrivateRoomAiIds("private:ada:")).toEqual([]);
    expect(getPrivateRoomAiIds("private:ada:+")).toEqual([]);
  });
});

describe("getPrivateRoomOwner", () => {
  it("names the user a private room belongs to", () => {
    expect(getPrivateRoomOwner("private:ada:A+B")).toBe("ada");
  });

  it("returns null for any other room", () => {
    expect(getPrivateRoomOwner("default")).toBeNull();
    expect(getPrivateRoomOwner("private:ada")).toBeNull();
  });
});

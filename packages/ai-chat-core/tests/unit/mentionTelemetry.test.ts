import { describe, it, expect } from "bun:test";
import { responseIncludesMention } from "@/utils/orchestrator/mentionUtils.js";

describe("responseIncludesMention", () => {
  it("detects the handle when present as an @mention", () => {
    expect(
      responseIncludesMention("Good point, @Bob - agreed!", "@Bob"),
    ).toBeTrue();
  });

  it("matches case-insensitively", () => {
    expect(responseIncludesMention("thanks @bob!", "@Bob")).toBeTrue();
  });

  it("accepts targets without the @ prefix", () => {
    expect(responseIncludesMention("well said @Bob", "Bob")).toBeTrue();
  });

  it("does not count the bare name without an @", () => {
    expect(
      responseIncludesMention("I think Bob is right about this", "@Bob"),
    ).toBeFalse();
  });

  it("returns false when the handle is absent", () => {
    expect(
      responseIncludesMention("Interesting take on the topic.", "@Bob"),
    ).toBeFalse();
  });

  it("matches across alias vocabulary via mention resolution", () => {
    // "@chatgpt" and "@gpt" resolve to the same canonical participant
    expect(responseIncludesMention("what say you, @chatgpt?", "@gpt")).toBe(
      responseIncludesMention("what say you, @gpt?", "@gpt"),
    );
  });

  it("handles empty inputs", () => {
    expect(responseIncludesMention("", "@Bob")).toBeFalse();
    expect(responseIncludesMention("hello @Bob", "")).toBeFalse();
    expect(responseIncludesMention("hello @Bob", "@")).toBeFalse();
  });
});

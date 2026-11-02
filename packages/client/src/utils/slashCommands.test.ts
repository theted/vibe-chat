import { describe, expect, it } from "vitest";
import { matchSlashCommands, parseSlashCommand } from "./slashCommands";

describe("parseSlashCommand", () => {
  it("recognises the known commands, in any case and with stray spaces", () => {
    expect(parseSlashCommand("/clear")).toEqual({
      kind: "known",
      name: "clear",
    });
    expect(parseSlashCommand("  /DEBUG ")).toEqual({
      kind: "known",
      name: "debug",
    });
  });

  it("flags a slash word it doesn't know", () => {
    expect(parseSlashCommand("/shrug me")).toEqual({
      kind: "unknown",
      name: "shrug",
    });
  });

  it("leaves ordinary messages alone, including ones starting with a path", () => {
    expect(parseSlashCommand("hello /clear")).toBeNull();
    expect(parseSlashCommand("/r/programming is fun")).toBeNull();
    expect(parseSlashCommand("/")).toBeNull();
  });
});

describe("matchSlashCommands", () => {
  it("matches by prefix until a space is typed", () => {
    expect(matchSlashCommands("/").map(({ name }) => name)).toEqual([
      "clear",
      "debug",
    ]);
    expect(matchSlashCommands("/C").map(({ name }) => name)).toEqual(["clear"]);
    expect(matchSlashCommands("/clear ")).toEqual([]);
    expect(matchSlashCommands("hi")).toEqual([]);
  });
});

import { describe, it, expect } from "vitest";
import { AMBIENT_ROOM_HUES } from "@/config/voices";
import { getRoomHues, roomHueStyle } from "./roomVoices";
import { getVoiceHue } from "./voice";
import type { Message } from "@/types";

let nextId = 0;
const aiMessage = (providerKey: string): Message => ({
  id: `m${nextId++}`,
  sender: `${providerKey} model`,
  senderType: "ai",
  providerKey,
  content: "hi",
  timestamp: nextId,
});
const userMessage = (): Message => ({
  id: `m${nextId++}`,
  sender: "ada",
  senderType: "user",
  content: "hi",
  timestamp: nextId,
});

describe("getRoomHues", () => {
  it("falls back to the ambient hues when no model has spoken", () => {
    expect(getRoomHues([userMessage()], [])).toEqual([...AMBIENT_ROOM_HUES]);
  });

  it("repeats a lone voice so the room glows in its colour alone", () => {
    const hue = getVoiceHue("Anthropic");
    expect(getRoomHues([aiMessage("Anthropic"), userMessage()], [])).toEqual([
      hue,
      hue,
      hue,
    ]);
  });

  it("keeps the same order when two models trade replies", () => {
    const first = getRoomHues(
      [aiMessage("OpenAI"), aiMessage("Anthropic")],
      [],
    );
    const second = getRoomHues(
      [aiMessage("Anthropic"), aiMessage("OpenAI")],
      [],
    );
    expect(first).toEqual(second);
  });

  it("takes the most recent distinct voices", () => {
    const messages = ["Cohere", "Google", "OpenAI", "Anthropic"].map(aiMessage);
    const hues = getRoomHues(messages, []);
    expect(hues).not.toContain(getVoiceHue("Cohere"));
    expect(hues).toEqual(
      ["Google", "OpenAI", "Anthropic"]
        .map((provider) => getVoiceHue(provider))
        .sort((a, b) => a - b),
    );
  });
});

describe("roomHueStyle", () => {
  it("numbers the custom properties from one", () => {
    expect(roomHueStyle([10, 20, 30])).toEqual({
      "--room-h1": 10,
      "--room-h2": 20,
      "--room-h3": 30,
    });
  });
});

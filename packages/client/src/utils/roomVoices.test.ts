import { describe, it, expect } from "vitest";
import { AMBIENT_ROOM_HUES } from "@/config/voices";
import {
  getPrivateRoomHues,
  getRoomHues,
  getRoomSpeakers,
  roomHueStyle,
} from "./roomVoices";
import { getVoiceHue, resolveVoiceHues } from "./voice";
import type { Message } from "@/types";
import type { AiParticipant } from "@/config/aiParticipants";

let nextId = 0;
const aiMessage = (aiId: string): Message => ({
  id: `m${nextId++}`,
  sender: `${aiId} model`,
  senderType: "ai",
  aiId,
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

const roster: AiParticipant[] = [
  {
    id: "OPUS",
    name: "Claude Opus",
    alias: "opus",
    provider: "Anthropic",
    emoji: "🎸",
    status: "active",
  },
  {
    id: "HAIKU",
    name: "Claude Haiku",
    alias: "haiku",
    provider: "Anthropic",
    emoji: "🎵",
    status: "active",
  },
];

describe("getRoomSpeakers", () => {
  it("lists each model once, most recent first", () => {
    const messages = [
      aiMessage("OPUS"),
      userMessage(),
      aiMessage("HAIKU"),
      aiMessage("OPUS"),
    ];

    const { byRecency, firstSpokeOrder } = getRoomSpeakers(messages, roster);

    expect(byRecency.map((speaker) => speaker.name)).toEqual([
      "Claude Opus",
      "Claude Haiku",
    ]);
    expect(byRecency[0]).toMatchObject({ emoji: "🎸", ai: roster[0] });
    expect(firstSpokeOrder).toEqual(["opus", "haiku"]);
  });

  it("only looks back as far as asked", () => {
    const messages = [aiMessage("OPUS"), aiMessage("HAIKU")];
    const { byRecency } = getRoomSpeakers(messages, roster, 1);
    expect(byRecency.map((speaker) => speaker.name)).toEqual(["Claude Haiku"]);
  });

  it("spreads colours only among the voices heard most recently", () => {
    const messages = ["A", "B", "OPUS", "HAIKU"].map(aiMessage);
    const { byRecency, firstSpokeOrder } = getRoomSpeakers(
      messages,
      roster,
      30,
      2,
    );
    expect(byRecency).toHaveLength(4);
    expect(firstSpokeOrder).toEqual(["opus", "haiku"]);
  });

  it("keeps models the roster doesn't know, without a roster entry", () => {
    const { byRecency } = getRoomSpeakers([aiMessage("CHAT")], roster);
    expect(byRecency).toEqual([
      expect.objectContaining({ voiceKey: "chat", ai: null }),
    ]);
  });
});

describe("room colours", () => {
  it("gives two models of the same lab different colours", () => {
    const { firstSpokeOrder } = getRoomSpeakers(
      [aiMessage("OPUS"), aiMessage("HAIKU")],
      roster,
    );
    const hues = resolveVoiceHues(firstSpokeOrder);
    expect(hues.get("opus")).not.toBe(hues.get("haiku"));
  });
});

describe("getRoomHues", () => {
  it("falls back to the ambient hues when no model has spoken", () => {
    expect(getRoomHues([userMessage()], [])).toEqual([...AMBIENT_ROOM_HUES]);
  });

  it("repeats a lone voice so the room glows in its colour alone", () => {
    const hue = getVoiceHue("opus");
    expect(getRoomHues([aiMessage("OPUS"), userMessage()], [])).toEqual([
      hue,
      hue,
      hue,
    ]);
  });

  it("uses the conversation's colours when given them", () => {
    expect(getRoomHues([aiMessage("OPUS")], [], () => 123)).toEqual([
      123, 123, 123,
    ]);
  });

  it("keeps the same order when two models trade replies", () => {
    const first = getRoomHues([aiMessage("A"), aiMessage("B")], []);
    const second = getRoomHues([aiMessage("B"), aiMessage("A")], []);
    expect(first).toEqual(second);
  });

  it("takes the most recent distinct voices", () => {
    const hueFor = (key: string) => ({ a: 10, b: 20, c: 30, d: 40 })[key] ?? 0;
    const messages = ["A", "B", "C", "D"].map(aiMessage);
    expect(getRoomHues(messages, [], hueFor)).toEqual([20, 30, 40]);
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

describe("getPrivateRoomHues", () => {
  const hueFor = (voiceKey: string) => voiceKey.length * 10;
  const [first, second] = roster;

  it("glows in the one partner's voice in a 1-1 chat", () => {
    const hue = getPrivateRoomHues([first], hueFor)[0];
    expect(getPrivateRoomHues([first], hueFor)).toEqual([hue, hue, hue]);
  });

  it("spreads a group's members across the aura", () => {
    const hues = getPrivateRoomHues([first, second], hueFor, 3);
    expect(hues).toHaveLength(3);
    expect(hues[2]).toBe(hues[0]);
  });

  it("is empty without known members", () => {
    expect(getPrivateRoomHues([], hueFor)).toEqual([]);
  });
});

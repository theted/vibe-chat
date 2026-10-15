import { describe, expect, it } from "bun:test";
import { AIStreakTracker } from "@/orchestrator/AIStreakTracker.js";

const makeTracker = (max = 3) => {
  const events: string[] = [];
  const tracker = new AIStreakTracker(max, {
    onSleep: (roomId, reason) => events.push(`sleep:${roomId}:${reason}`),
    onWake: (roomId) => events.push(`wake:${roomId}`),
  });
  return { tracker, events };
};

describe("AIStreakTracker", () => {
  it("refuses every claim past the limit until a human posts", () => {
    const { tracker, events } = makeTracker(3);

    expect([1, 2, 3, 4, 5].map(() => tracker.claim("default"))).toEqual([
      true,
      true,
      true,
      false,
      false,
    ]);
    expect(tracker.getStatus("default")).toMatchObject({
      messageCount: 3,
      remaining: 0,
      isAsleep: true,
      sleepReason: "message-limit-reached",
    });
    expect(events).toEqual(["sleep:default:message-limit-reached"]);

    tracker.recordHumanMessage("default");

    expect(events).toEqual([
      "sleep:default:message-limit-reached",
      "wake:default",
    ]);
    expect(tracker.claim("default")).toBe(true);
  });

  it("keeps each room's budget separate", () => {
    const { tracker } = makeTracker(2);
    tracker.claim("default");
    tracker.claim("default");

    expect(tracker.canSpeak("default")).toBe(false);
    expect(tracker.canSpeak("private:ada:claude")).toBe(true);

    // A human elsewhere doesn't wake this room
    tracker.recordHumanMessage("private:ada:claude");
    expect(tracker.canSpeak("default")).toBe(false);
  });

  it("only fires wake when the room was actually asleep", () => {
    const { tracker, events } = makeTracker(3);
    tracker.claim("default");
    tracker.recordHumanMessage("default");

    expect(events).toEqual([]);
    expect(tracker.getStatus("default").messageCount).toBe(0);
  });

  it("reports fatigue as the share of the budget spent", () => {
    const { tracker } = makeTracker(4);
    expect(tracker.getFatigue("default")).toBe(0);
    tracker.claim("default");
    expect(tracker.getFatigue("default")).toBe(0.25);
  });

  it("can be put to sleep by hand and woken again", () => {
    const { tracker } = makeTracker(5);
    tracker.sleep("default", "admin");
    expect(tracker.claim("default")).toBe(false);

    tracker.wake("default");
    expect(tracker.claim("default")).toBe(true);
  });

  it("reports every change a viewer could see, and nothing else", () => {
    const changes: string[] = [];
    const tracker = new AIStreakTracker(2, {
      onChange: ({ roomId, remaining, isAsleep }) =>
        changes.push(`${roomId}:${remaining}:${isAsleep ? "asleep" : "awake"}`),
    });

    tracker.recordHumanMessage("default"); // full budget already: no change
    tracker.claim("default");
    tracker.claim("default");
    tracker.claim("default"); // refused: no change
    tracker.recordHumanMessage("default");

    expect(changes).toEqual([
      "default:1:awake",
      "default:0:asleep",
      "default:2:awake",
    ]);
  });

  it("rejects a limit that could never allow a message", () => {
    expect(() => new AIStreakTracker(0)).toThrow();
  });
});

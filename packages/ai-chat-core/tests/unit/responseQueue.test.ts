import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import type FakeTimers from "@sinonjs/fake-timers";
import {
  ResponseQueue,
  type QueuedResponse,
} from "@/orchestrator/ResponseQueue.js";
import { installFakeClock } from "../helpers/orchestratorTestUtils.js";

let clock: FakeTimers.InstalledClock;

beforeEach(() => {
  clock = installFakeClock();
});

afterEach(() => {
  clock.uninstall();
});

const reply = (
  aiId: string,
  delayMs: number,
  roomId = "default",
): QueuedResponse => ({
  aiId,
  roomId,
  isUserResponse: true,
  options: {},
  scheduledTime: Date.now() + delayMs,
});

const makeQueue = (maxConcurrent = 2, canDispatch = () => true) => {
  const dispatched: string[] = [];
  const queue = new ResponseQueue({
    maxConcurrent,
    canDispatch,
    onDispatch: (aiId) => dispatched.push(aiId),
  });
  return { queue, dispatched };
};

describe("ResponseQueue", () => {
  it("dispatches each reply when it is due, in time order", async () => {
    const { queue, dispatched } = makeQueue(5);
    queue.enqueueBatch([reply("late", 300), reply("early", 100)]);

    await clock.tickAsync(150);
    expect(dispatched).toEqual(["early"]);
    await clock.tickAsync(200);
    expect(dispatched).toEqual(["early", "late"]);
  });

  it("waits for a free slot instead of exceeding the limit", async () => {
    const { queue, dispatched } = makeQueue(1);
    queue.enqueueBatch([reply("a", 0), reply("b", 0)]);

    await clock.tickAsync(10);
    expect(dispatched).toEqual(["a"]);

    queue.onResponseComplete("default");
    expect(dispatched).toEqual(["a", "b"]);
  });

  it("drops replies the room can no longer take", async () => {
    let canSpeak = true;
    const { queue, dispatched } = makeQueue(2, () => canSpeak);
    queue.enqueueBatch([reply("a", 100)]);

    canSpeak = false;
    await clock.tickAsync(200);

    expect(dispatched).toEqual([]);
    expect(queue.pendingCount).toBe(0);
  });

  it("removing the reply it was waiting on doesn't fire the next one early", async () => {
    const { queue, dispatched } = makeQueue(2);
    queue.enqueueBatch([reply("soon", 100), reply("later", 1_000)]);

    queue.removeWhere((response) => response.aiId === "soon");
    await clock.tickAsync(200);
    expect(dispatched).toEqual([]);

    await clock.tickAsync(1_000);
    expect(dispatched).toEqual(["later"]);
  });

  it("retargeting keeps the sooner dispatch time", async () => {
    const { queue, dispatched } = makeQueue(2);
    queue.enqueue(reply("a", 5_000));
    const pending = queue.findPending("default", "a") as QueuedResponse;

    queue.retarget(pending, {
      isUserResponse: false,
      options: { isMentioned: true },
      scheduledTime: Date.now() + 100,
    });
    await clock.tickAsync(150);

    expect(dispatched).toEqual(["a"]);
  });

  it("counts queued and generating replies per room", async () => {
    const { queue } = makeQueue(1);
    queue.enqueueBatch([
      reply("a", 0),
      reply("b", 1_000),
      reply("c", 0, "private:ada:x"),
    ]);
    await clock.tickAsync(10);

    // "a" is generating, "b" and "c" are queued
    expect(queue.countForRoom("default")).toBe(2);
    expect(queue.countForRoom("private:ada:x")).toBe(1);

    queue.onResponseComplete("default");
    expect(queue.countForRoom("default")).toBe(1);
  });
});

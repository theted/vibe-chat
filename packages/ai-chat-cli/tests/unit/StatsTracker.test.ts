import { afterEach, describe, it, expect, mock } from "bun:test";
import type { RedisClientType } from "redis";
import { StatsTracker } from "@/services/StatsTracker.js";
import {
  STATS_MAX_CONTENT_LENGTH,
  STATS_TOTAL_AI_MESSAGES_KEY,
  STATS_TOTAL_MESSAGES_KEY,
} from "@/config/statsConstants.js";

const originalRedisUrl = process.env.REDIS_URL;

const restoreRedisUrl = () => {
  if (originalRedisUrl === undefined) {
    delete process.env.REDIS_URL;
  } else {
    process.env.REDIS_URL = originalRedisUrl;
  }
};

describe("StatsTracker", () => {
  afterEach(() => {
    restoreRedisUrl();
  });

  it("records assistant messages when redis is available", async () => {
    process.env.REDIS_URL = "redis://localhost:6379";
    const pipeline = {
      incr: mock((key: string) => pipeline),
      lPush: mock((key: string, value: string) => pipeline),
      lTrim: mock((key: string, start: number, end: number) => pipeline),
      exec: mock(async () => {}),
    };
    const fakeClient = {
      connect: mock(async () => {}),
      on: mock(
        (_event: string, _handler: (...args: unknown[]) => void) => {},
      ),
      multi: mock(() => pipeline),
    };
    const tracker = new StatsTracker({
      clientFactory: async () => {
        await fakeClient.connect();
        return fakeClient as unknown as RedisClientType;
      },
    });

    const content = "a".repeat(STATS_MAX_CONTENT_LENGTH + 500);

    await tracker.recordMessage({
      role: "assistant",
      content,
      provider: "ProviderA",
      model: "model-a",
    });

    expect(fakeClient.connect.mock.calls.length).toBe(1);
    expect(fakeClient.multi.mock.calls.length).toBe(1);

    expect(pipeline.incr.mock.calls.length).toBe(2);
    expect(
      pipeline.incr.mock.calls.map(([key]) => key),
    ).toEqual(
      [STATS_TOTAL_MESSAGES_KEY, STATS_TOTAL_AI_MESSAGES_KEY],
    );

    expect(pipeline.lPush.mock.calls.length).toBe(1);
    const payload = pipeline.lPush.mock.calls[0][1];
    const parsed = JSON.parse(payload);
    expect(parsed.role).toBe("assistant");
    expect(parsed.provider).toBe("ProviderA");
    expect(parsed.model).toBe("model-a");
    expect(parsed.content.length).toBe(STATS_MAX_CONTENT_LENGTH);
    expect(parsed.content).toBe("a".repeat(STATS_MAX_CONTENT_LENGTH));

    expect(pipeline.lTrim.mock.calls.length).toBe(1);
    expect(pipeline.exec.mock.calls.length).toBe(1);
  });

  it("disables redis usage when connection fails", async () => {
    process.env.REDIS_URL = "redis://localhost:6379";
    const tracker = new StatsTracker({
      clientFactory: async () => null,
    });

    // Should not reject
    await tracker.recordMessage({
      role: "assistant",
      content: "hello",
      provider: "Provider",
      model: "model",
    });

    expect(tracker.getStatus().enabled).toBe(false);
  });
});

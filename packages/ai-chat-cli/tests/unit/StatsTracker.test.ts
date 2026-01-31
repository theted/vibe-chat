import { afterEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
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
    mock.reset();
    restoreRedisUrl();
  });

  it("records assistant messages when redis is available", async () => {
    process.env.REDIS_URL = "redis://localhost:6379";
    const pipeline = {
      incr: mock.fn((key: string) => pipeline),
      lPush: mock.fn((key: string, value: string) => pipeline),
      lTrim: mock.fn((key: string, start: number, end: number) => pipeline),
      exec: mock.fn(async () => {}),
    };
    const fakeClient = {
      connect: mock.fn(async () => {}),
      on: mock.fn(
        (_event: string, _handler: (...args: unknown[]) => void) => {},
      ),
      multi: mock.fn(() => pipeline),
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

    assert.strictEqual(fakeClient.connect.mock.callCount(), 1);
    assert.strictEqual(fakeClient.multi.mock.callCount(), 1);

    assert.strictEqual(pipeline.incr.mock.callCount(), 2);
    assert.deepStrictEqual(
      pipeline.incr.mock.calls.map(({ arguments: [key] }) => key),
      [STATS_TOTAL_MESSAGES_KEY, STATS_TOTAL_AI_MESSAGES_KEY],
    );

    assert.strictEqual(pipeline.lPush.mock.callCount(), 1);
    const payload = pipeline.lPush.mock.calls[0].arguments[1];
    const parsed = JSON.parse(payload);
    assert.strictEqual(parsed.role, "assistant");
    assert.strictEqual(parsed.provider, "ProviderA");
    assert.strictEqual(parsed.model, "model-a");
    assert.strictEqual(parsed.content.length, STATS_MAX_CONTENT_LENGTH);
    assert.strictEqual(parsed.content, "a".repeat(STATS_MAX_CONTENT_LENGTH));

    assert.strictEqual(pipeline.lTrim.mock.callCount(), 1);
    assert.strictEqual(pipeline.exec.mock.callCount(), 1);
  });

  it("disables redis usage when connection fails", async () => {
    process.env.REDIS_URL = "redis://localhost:6379";
    const tracker = new StatsTracker({
      clientFactory: async () => null,
    });

    await assert.doesNotReject(
      tracker.recordMessage({
        role: "assistant",
        content: "hello",
        provider: "Provider",
        model: "model",
      }),
    );

    assert.strictEqual(tracker.getStatus().enabled, false);
  });
});

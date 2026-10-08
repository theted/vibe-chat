import { afterEach, describe, expect, it } from "bun:test";
import { createRedisClient } from "./RedisClient.js";

const ORIGINAL_REDIS_URL = process.env.REDIS_URL;

describe("createRedisClient", () => {
  afterEach(() => {
    if (ORIGINAL_REDIS_URL === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = ORIGINAL_REDIS_URL;
  });

  it("returns null when REDIS_URL is not set", async () => {
    delete process.env.REDIS_URL;

    expect(await createRedisClient()).toBeNull();
  });

  // The server awaits this before listening. node-redis's default strategy retried forever, so an
  // unreachable Redis kept the server from ever starting (and E2E red since September 2026).
  it("gives up on an unreachable Redis instead of waiting forever", async () => {
    // Port 1 refuses at once: Redis down, without depending on the network.
    process.env.REDIS_URL = "redis://127.0.0.1:1";
    const startedAt = Date.now();

    expect(await createRedisClient({ connectBudgetMs: 300 })).toBeNull();
    expect(Date.now() - startedAt).toBeLessThan(3_000);
  });
});

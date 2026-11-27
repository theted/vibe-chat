import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { checkChroma, checkRedis } from "./dependencyHealth.js";
import type { RedisClient } from "./RedisClient.js";

const fakeRedis = (overrides: Partial<RedisClient>) =>
  ({
    isReady: true,
    ping: async () => "PONG",
    ...overrides,
  }) as unknown as RedisClient;

describe("checkRedis", () => {
  it("reports disabled when REDIS_URL is not configured", async () => {
    expect(await checkRedis(null, { configured: false })).toEqual({
      status: "disabled",
    });
  });

  it("reports down when startup never connected", async () => {
    const result = await checkRedis(null);

    expect(result.status).toBe("down");
    expect(result.error).toBe("not connected");
  });

  it("reports down while the client is reconnecting", async () => {
    const result = await checkRedis(fakeRedis({ isReady: false }));

    expect(result).toMatchObject({ status: "down", error: "not connected" });
  });

  it("reports up when PING answers", async () => {
    const result = await checkRedis(fakeRedis({}));

    expect(result.status).toBe("up");
    expect(typeof result.latencyMs).toBe("number");
  });

  it("reports down when PING hangs past the timeout", async () => {
    const client = fakeRedis({ ping: () => new Promise(() => {}) });

    const result = await checkRedis(client, { timeoutMs: 50 });

    expect(result).toMatchObject({
      status: "down",
      error: "timed out after 50ms",
    });
  });
});

describe("checkChroma", () => {
  let server: Server;
  let baseUrl: string;
  let heartbeatStatus = 200;

  beforeAll(async () => {
    server = createServer((req, res) => {
      const status = req.url === "/api/v2/heartbeat" ? heartbeatStatus : 404;
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ "nanosecond heartbeat": 1 }));
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => {
    server.close();
  });

  it("reports disabled when CHROMA_URL is not set", async () => {
    expect(await checkChroma(undefined)).toEqual({ status: "disabled" });
  });

  it("reports up when the heartbeat answers 200", async () => {
    heartbeatStatus = 200;

    expect((await checkChroma(baseUrl)).status).toBe("up");
  });

  it("reports the HTTP status when the heartbeat fails", async () => {
    heartbeatStatus = 500;

    expect(await checkChroma(baseUrl)).toMatchObject({
      status: "down",
      error: "HTTP 500",
    });
  });

  it("reports down without leaking the address when nothing listens", async () => {
    // Port 1 refuses at once: Chroma down, without depending on the network
    expect(await checkChroma("http://127.0.0.1:1")).toMatchObject({
      status: "down",
      error: "unreachable",
    });
  });
});

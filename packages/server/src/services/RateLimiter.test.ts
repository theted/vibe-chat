import { describe, it, beforeEach, expect } from "bun:test";
import { RateLimiter, evaluateRateLimits } from "./RateLimiter.js";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const HUMAN_LIMITS = [
  { windowMs: HOUR, maxMessages: 10 },
  { windowMs: DAY, maxMessages: 50 },
];

describe("RateLimiter", () => {
  describe("in-memory mode", () => {
    let rateLimiter: RateLimiter;

    beforeEach(() => {
      rateLimiter = new RateLimiter({
        windowMs: 1000, // 1 second window
        maxMessages: 3,
      });
    });

    it("allows requests when under limit", async () => {
      const result = await rateLimiter.check("user-1");

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });

    it("allows null/undefined identifiers (no rate limiting)", async () => {
      const nullResult = await rateLimiter.check(null);
      const undefinedResult = await rateLimiter.check(undefined);

      expect(nullResult.allowed).toBe(true);
      expect(nullResult.remaining).toBe(3);
      expect(undefinedResult.allowed).toBe(true);
      expect(undefinedResult.remaining).toBe(3);
    });

    it("decrements remaining count with each request", async () => {
      const result1 = await rateLimiter.check("user-1");
      const result2 = await rateLimiter.check("user-1");
      const result3 = await rateLimiter.check("user-1");

      expect(result1.remaining).toBe(2);
      expect(result2.remaining).toBe(1);
      expect(result3.remaining).toBe(0);
    });

    it("blocks requests when limit exceeded", async () => {
      await rateLimiter.check("user-1");
      await rateLimiter.check("user-1");
      await rateLimiter.check("user-1");

      const result = await rateLimiter.check("user-1");

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfterMs).toBeDefined();
      expect(result.retryAfterMs).toBeGreaterThan(0);
      expect(result.retryAfterMs).toBeLessThanOrEqual(1000);
    });

    it("tracks different identifiers separately", async () => {
      await rateLimiter.check("user-1");
      await rateLimiter.check("user-1");
      await rateLimiter.check("user-1");

      const user1Result = await rateLimiter.check("user-1");
      const user2Result = await rateLimiter.check("user-2");

      expect(user1Result.allowed).toBe(false);
      expect(user2Result.allowed).toBe(true);
      expect(user2Result.remaining).toBe(2);
    });

    it("allows requests after window expires", async () => {
      const shortWindowLimiter = new RateLimiter({
        windowMs: 50, // 50ms window
        maxMessages: 1,
      });

      await shortWindowLimiter.check("user-1");
      const blockedResult = await shortWindowLimiter.check("user-1");
      expect(blockedResult.allowed).toBe(false);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 60));

      const allowedResult = await shortWindowLimiter.check("user-1");
      expect(allowedResult.allowed).toBe(true);
    });

    it("uses default options when not specified", async () => {
      const defaultLimiter = new RateLimiter();

      const result = await defaultLimiter.check("user-1");

      expect(result.allowed).toBe(true);
      // Default is 10 max messages
      expect(result.remaining).toBe(9);
    });

    it("cleans up old entries within sliding window", async () => {
      const shortWindowLimiter = new RateLimiter({
        windowMs: 100,
        maxMessages: 2,
      });

      await shortWindowLimiter.check("user-1");
      await new Promise((resolve) => setTimeout(resolve, 60));
      await shortWindowLimiter.check("user-1");

      // Wait for first entry to expire
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should be allowed as first entry expired
      const result = await shortWindowLimiter.check("user-1");
      expect(result.allowed).toBe(true);
    });
  });

  describe("with custom key prefix", () => {
    it("uses custom key prefix", async () => {
      const rateLimiter = new RateLimiter({
        windowMs: 1000,
        maxMessages: 5,
        keyPrefix: "custom-prefix:",
      });

      const result = await rateLimiter.check("user-1");
      expect(result.allowed).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("treats empty string identifier as no identifier (no rate limiting)", async () => {
      const rateLimiter = new RateLimiter({
        windowMs: 1000,
        maxMessages: 2,
      });

      // Empty string is treated as falsy, like null/undefined
      const result1 = await rateLimiter.check("");
      const result2 = await rateLimiter.check("");
      const result3 = await rateLimiter.check("");

      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(2);
      expect(result2.allowed).toBe(true);
      expect(result3.allowed).toBe(true);
    });

    it("handles special characters in identifier", async () => {
      const rateLimiter = new RateLimiter({
        windowMs: 1000,
        maxMessages: 2,
      });

      const result = await rateLimiter.check("192.168.1.1:8080");
      expect(result.allowed).toBe(true);
    });

    it("handles rapid concurrent requests", async () => {
      const rateLimiter = new RateLimiter({
        windowMs: 1000,
        maxMessages: 5,
      });

      const results = await Promise.all([
        rateLimiter.check("user-1"),
        rateLimiter.check("user-1"),
        rateLimiter.check("user-1"),
        rateLimiter.check("user-1"),
        rateLimiter.check("user-1"),
        rateLimiter.check("user-1"),
        rateLimiter.check("user-1"),
      ]);

      const allowedCount = results.filter((r) => r.allowed).length;
      const blockedCount = results.filter((r) => !r.allowed).length;

      expect(allowedCount).toBe(5);
      expect(blockedCount).toBe(2);
    });

    it("calculates retryAfterMs correctly", async () => {
      const rateLimiter = new RateLimiter({
        windowMs: 1000,
        maxMessages: 1,
      });

      await rateLimiter.check("user-1");
      const blockedResult = await rateLimiter.check("user-1");

      expect(blockedResult.allowed).toBe(false);
      expect(blockedResult.retryAfterMs).toBeDefined();
      // Should be close to windowMs since we just hit the limit
      expect(blockedResult.retryAfterMs).toBeGreaterThan(900);
      expect(blockedResult.retryAfterMs).toBeLessThanOrEqual(1000);
    });
  });

  describe("several windows at once", () => {
    it("blocks the 11th message within an hour", async () => {
      const rateLimiter = new RateLimiter({ limits: HUMAN_LIMITS });
      const results = [];
      for (let i = 0; i < 11; i += 1) {
        results.push(await rateLimiter.check("1.2.3.4"));
      }

      expect(results.slice(0, 10).every((r) => r.allowed)).toBe(true);
      expect(results[9].remaining).toBe(0);
      expect(results[10]).toMatchObject({
        allowed: false,
        limit: { windowMs: HOUR, maxMessages: 10 },
      });
    });

    it("blocks the 51st message within a day even when spread out", () => {
      const now = 10 * DAY;
      // 50 messages, one every 25 minutes: never 10 in any hour
      const timestamps = Array.from(
        { length: 50 },
        (_, i) => now - DAY + 1 + i * 25 * 60 * 1000,
      ).filter((timestamp) => timestamp < now);

      const result = evaluateRateLimits(timestamps, now, HUMAN_LIMITS);

      expect(result.allowed).toBe(false);
      expect(result.limit).toEqual({ windowMs: DAY, maxMessages: 50 });
      // The oldest of the 50 ages out of the day first
      expect(result.retryAfterMs).toBe(timestamps[0] + DAY - now);
    });

    it("reports the longest wait when both windows are full", () => {
      const now = 10 * DAY;
      const timestamps = [
        ...Array.from({ length: 40 }, (_, i) => now - 20 * HOUR + i),
        ...Array.from({ length: 10 }, (_, i) => now - 30 * 60 * 1000 + i),
      ];

      const result = evaluateRateLimits(timestamps, now, HUMAN_LIMITS);

      expect(result.allowed).toBe(false);
      expect(result.limit?.windowMs).toBe(DAY);
      expect(result.retryAfterMs).toBe(4 * HOUR);
    });

    it("reports the tightest remaining quota", () => {
      const now = 10 * DAY;
      const timestamps = Array.from(
        { length: 45 },
        (_, i) => now - 5 * HOUR + i,
      );

      const result = evaluateRateLimits(timestamps, now, HUMAN_LIMITS);

      // 9 left this hour, but only 4 left today (this one included)
      expect(result).toEqual({ allowed: true, remaining: 4 });
    });

    it("doesn't record blocked attempts", async () => {
      const rateLimiter = new RateLimiter({
        limits: [{ windowMs: 50, maxMessages: 1 }],
      });
      await rateLimiter.check("user-1");
      await rateLimiter.check("user-1");
      await rateLimiter.check("user-1");

      await new Promise((resolve) => setTimeout(resolve, 60));

      expect((await rateLimiter.check("user-1")).allowed).toBe(true);
    });
  });
});

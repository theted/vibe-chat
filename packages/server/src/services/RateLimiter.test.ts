import { describe, it, beforeEach, expect } from "bun:test";
import { RateLimiter } from "./RateLimiter.js";

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
});

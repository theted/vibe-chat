import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
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

      assert.equal(result.allowed, true);
      assert.equal(result.remaining, 2);
    });

    it("allows null/undefined identifiers (no rate limiting)", async () => {
      const nullResult = await rateLimiter.check(null);
      const undefinedResult = await rateLimiter.check(undefined);

      assert.equal(nullResult.allowed, true);
      assert.equal(nullResult.remaining, 3);
      assert.equal(undefinedResult.allowed, true);
      assert.equal(undefinedResult.remaining, 3);
    });

    it("decrements remaining count with each request", async () => {
      const result1 = await rateLimiter.check("user-1");
      const result2 = await rateLimiter.check("user-1");
      const result3 = await rateLimiter.check("user-1");

      assert.equal(result1.remaining, 2);
      assert.equal(result2.remaining, 1);
      assert.equal(result3.remaining, 0);
    });

    it("blocks requests when limit exceeded", async () => {
      await rateLimiter.check("user-1");
      await rateLimiter.check("user-1");
      await rateLimiter.check("user-1");

      const result = await rateLimiter.check("user-1");

      assert.equal(result.allowed, false);
      assert.equal(result.remaining, 0);
      assert.ok(result.retryAfterMs !== undefined);
      assert.ok(result.retryAfterMs > 0);
      assert.ok(result.retryAfterMs <= 1000);
    });

    it("tracks different identifiers separately", async () => {
      await rateLimiter.check("user-1");
      await rateLimiter.check("user-1");
      await rateLimiter.check("user-1");

      const user1Result = await rateLimiter.check("user-1");
      const user2Result = await rateLimiter.check("user-2");

      assert.equal(user1Result.allowed, false);
      assert.equal(user2Result.allowed, true);
      assert.equal(user2Result.remaining, 2);
    });

    it("allows requests after window expires", async () => {
      const shortWindowLimiter = new RateLimiter({
        windowMs: 50, // 50ms window
        maxMessages: 1,
      });

      await shortWindowLimiter.check("user-1");
      const blockedResult = await shortWindowLimiter.check("user-1");
      assert.equal(blockedResult.allowed, false);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 60));

      const allowedResult = await shortWindowLimiter.check("user-1");
      assert.equal(allowedResult.allowed, true);
    });

    it("uses default options when not specified", async () => {
      const defaultLimiter = new RateLimiter();

      const result = await defaultLimiter.check("user-1");

      assert.equal(result.allowed, true);
      // Default is 10 max messages
      assert.equal(result.remaining, 9);
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
      assert.equal(result.allowed, true);
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
      assert.equal(result.allowed, true);
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

      assert.equal(result1.allowed, true);
      assert.equal(result1.remaining, 2);
      assert.equal(result2.allowed, true);
      assert.equal(result3.allowed, true);
    });

    it("handles special characters in identifier", async () => {
      const rateLimiter = new RateLimiter({
        windowMs: 1000,
        maxMessages: 2,
      });

      const result = await rateLimiter.check("192.168.1.1:8080");
      assert.equal(result.allowed, true);
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

      assert.equal(allowedCount, 5);
      assert.equal(blockedCount, 2);
    });

    it("calculates retryAfterMs correctly", async () => {
      const rateLimiter = new RateLimiter({
        windowMs: 1000,
        maxMessages: 1,
      });

      await rateLimiter.check("user-1");
      const blockedResult = await rateLimiter.check("user-1");

      assert.equal(blockedResult.allowed, false);
      assert.ok(blockedResult.retryAfterMs !== undefined);
      // Should be close to windowMs since we just hit the limit
      assert.ok(blockedResult.retryAfterMs > 900);
      assert.ok(blockedResult.retryAfterMs <= 1000);
    });
  });
});

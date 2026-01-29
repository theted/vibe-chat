import type { RateLimitResult } from "@/types.js";
import type { RedisClient } from "./RedisClient.js";

const DEFAULT_KEY_PREFIX = "rate-limiter:";

type RateLimiterOptions = {
  windowMs?: number;
  maxMessages?: number;
  redisClient?: RedisClient | null;
  keyPrefix?: string;
};

/**
 * IP-based sliding window rate limiter with optional Redis backing.
 */
export class RateLimiter {
  private windowMs: number;
  private maxMessages: number;
  private redisClient: RedisClient | null;
  private keyPrefix: string;
  private memoryStore: Map<string, number[]>;

  /**
   * Create a new RateLimiter.
   * @param options - Window size, max messages, and optional Redis client.
   */
  constructor(options: RateLimiterOptions = {}) {
    const {
      windowMs = 60 * 1000,
      maxMessages = 10,
      redisClient = null,
      keyPrefix = DEFAULT_KEY_PREFIX,
    } = options;

    this.windowMs = windowMs;
    this.maxMessages = maxMessages;
    this.redisClient = redisClient;
    this.keyPrefix = keyPrefix;
    this.memoryStore = new Map();
  }

  /**
   * Check if an identifier is allowed to send a message.
   * @param identifier - IP address or other unique key.
   * @returns Rate limit decision with remaining quota.
   */
  async check(
    identifier: string | null | undefined
  ): Promise<RateLimitResult> {
    if (!identifier) {
      return { allowed: true, remaining: this.maxMessages };
    }

    if (this.redisClient) {
      try {
        return await this.#checkWithRedis(identifier);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(
          `⚠️  RateLimiter redis fallback for ${identifier}: ${message}`
        );
      }
    }

    return this.#checkInMemory(identifier);
  }

  async #checkWithRedis(identifier: string): Promise<RateLimitResult> {
    const client = this.redisClient;
    if (!client) {
      return this.#checkInMemory(identifier);
    }
    const key = `${this.keyPrefix}${identifier}`;
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const multi = client.multi();
    multi.zRemRangeByScore(key, 0, windowStart);
    multi.zCard(key);
    multi.zRangeWithScores(key, 0, 0);

    const results = (await multi.exec()) as Array<unknown> | null;
    if (!Array.isArray(results)) {
      return this.#checkInMemory(identifier);
    }
    const currentCountRaw = results?.[1];
    const currentCount = Number(currentCountRaw ?? 0);

    let oldestTimestamp: number | null = null;
    const oldestEntry = results?.[2] as Array<{ score: number }> | undefined;
    if (Array.isArray(oldestEntry) && oldestEntry.length > 0) {
      oldestTimestamp = Number(oldestEntry[0]?.score);
    }

    if (Number.isNaN(currentCount)) {
      return { allowed: true, remaining: this.maxMessages };
    }

    if (currentCount >= this.maxMessages) {
      const retryAfterMs = oldestTimestamp
        ? Math.max(this.windowMs - (now - oldestTimestamp), 0)
        : this.windowMs;
      return { allowed: false, remaining: 0, retryAfterMs };
    }

    const value = `${now}:${Math.random().toString(36).slice(2, 10)}`;
    await client.zAdd(key, [{ score: now, value }]);
    await client.expire(key, Math.ceil(this.windowMs / 1000));

    return {
      allowed: true,
      remaining: Math.max(this.maxMessages - (currentCount + 1), 0),
    };
  }

  #checkInMemory(identifier: string): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const existing = this.memoryStore.get(identifier) || [];
    const entries = existing.filter((timestamp) => timestamp > windowStart);

    if (entries.length >= this.maxMessages) {
      const oldestTimestamp = entries[0];
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: Math.max(this.windowMs - (now - oldestTimestamp), 0),
      };
    }

    entries.push(now);
    this.memoryStore.set(identifier, entries);

    return {
      allowed: true,
      remaining: Math.max(this.maxMessages - entries.length, 0),
    };
  }
}

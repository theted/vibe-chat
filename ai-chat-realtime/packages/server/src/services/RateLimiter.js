/**
 * IP-based sliding window rate limiter with optional Redis backing.
 */

const DEFAULT_KEY_PREFIX = "rate-limiter:";

export class RateLimiter {
  constructor(options = {}) {
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

  async check(identifier) {
    if (!identifier) {
      return { allowed: true, remaining: this.maxMessages };
    }

    if (this.redisClient) {
      try {
        return await this.#checkWithRedis(identifier);
      } catch (error) {
        console.warn(
          `⚠️  RateLimiter redis fallback for ${identifier}: ${error.message}`
        );
      }
    }

    return this.#checkInMemory(identifier);
  }

  async #checkWithRedis(identifier) {
    const key = `${this.keyPrefix}${identifier}`;
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const multi = this.redisClient.multi();
    multi.zRemRangeByScore(key, 0, windowStart);
    multi.zCard(key);
    multi.zRange(key, 0, 0, { WITHSCORES: true });

    const results = await multi.exec();
    if (!Array.isArray(results)) {
      return this.#checkInMemory(identifier);
    }
    const currentCountRaw = results?.[1];
    const currentCount = Number(currentCountRaw ?? 0);

    let oldestTimestamp = null;
    const oldestEntry = results?.[2];
    if (Array.isArray(oldestEntry) && oldestEntry.length >= 2) {
      const [, score] = oldestEntry;
      oldestTimestamp = Number(score);
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
    await this.redisClient.zAdd(key, [{ score: now, value }]);
    await this.redisClient.expire(key, Math.ceil(this.windowMs / 1000));

    return {
      allowed: true,
      remaining: Math.max(this.maxMessages - (currentCount + 1), 0),
    };
  }

  #checkInMemory(identifier) {
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

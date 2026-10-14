import type { RateLimitResult, RateLimitWindow } from "@/types.js";
import type { RedisClient } from "./RedisClient.js";

const DEFAULT_KEY_PREFIX = "rate-limiter:";
const DEFAULT_LIMIT: RateLimitWindow = { windowMs: 60 * 1000, maxMessages: 10 };

type RateLimiterOptions = {
  /** Every window applies at once, e.g. 10 per hour and 50 per day. */
  limits?: readonly RateLimitWindow[];
  /** Shorthand for a single window (ignored when `limits` is given). */
  windowMs?: number;
  maxMessages?: number;
  redisClient?: RedisClient | null;
  keyPrefix?: string;
};

/**
 * Decide a request against every window, given the identifier's earlier
 * timestamps (ascending). When several windows are full, the reported wait
 * is the longest one - that is when a message can actually go through.
 */
export const evaluateRateLimits = (
  timestamps: number[],
  now: number,
  limits: readonly RateLimitWindow[],
): RateLimitResult => {
  let remaining = Number.POSITIVE_INFINITY;
  let blocked: { limit: RateLimitWindow; retryAfterMs: number } | null = null;

  for (const limit of limits) {
    const inWindow = timestamps.filter(
      (timestamp) => timestamp > now - limit.windowMs,
    );
    if (inWindow.length >= limit.maxMessages) {
      // A slot frees up when the entry `maxMessages` back from the newest
      // ages out of the window
      const freeingEntry = inWindow[inWindow.length - limit.maxMessages];
      const retryAfterMs = Math.max(freeingEntry + limit.windowMs - now, 0);
      if (!blocked || retryAfterMs > blocked.retryAfterMs) {
        blocked = { limit, retryAfterMs };
      }
      continue;
    }
    remaining = Math.min(remaining, limit.maxMessages - inWindow.length - 1);
  }

  if (blocked) {
    return { allowed: false, remaining: 0, ...blocked };
  }
  return { allowed: true, remaining };
};

/**
 * IP-based sliding-window rate limiter over one or more windows, with
 * optional Redis backing. Each identifier keeps one sorted set of send
 * timestamps covering the longest window.
 */
export class RateLimiter {
  private limits: readonly RateLimitWindow[];
  private longestWindowMs: number;
  private redisClient: RedisClient | null;
  private keyPrefix: string;
  private memoryStore: Map<string, number[]>;
  /** Per-identifier chain so two sends can't both pass a check-then-add. */
  private pendingChecks = new Map<string, Promise<unknown>>();

  /**
   * Create a new RateLimiter.
   * @param options - Windows, optional Redis client and key prefix.
   */
  constructor(options: RateLimiterOptions = {}) {
    const {
      windowMs = DEFAULT_LIMIT.windowMs,
      maxMessages = DEFAULT_LIMIT.maxMessages,
      redisClient = null,
      keyPrefix = DEFAULT_KEY_PREFIX,
    } = options;

    this.limits = options.limits?.length
      ? options.limits
      : [{ windowMs, maxMessages }];
    for (const limit of this.limits) {
      if (limit.windowMs <= 0 || limit.maxMessages < 1) {
        throw new Error(
          `RateLimiter windows need a positive duration and limit, got ${JSON.stringify(limit)}`,
        );
      }
    }
    this.longestWindowMs = Math.max(...this.limits.map((l) => l.windowMs));
    this.redisClient = redisClient;
    this.keyPrefix = keyPrefix;
    this.memoryStore = new Map();
  }

  /**
   * Check if an identifier may send a message, recording the send if so.
   * @param identifier - IP address or other unique key.
   * @returns Rate limit decision with remaining quota.
   */
  async check(identifier: string | null | undefined): Promise<RateLimitResult> {
    if (!identifier) {
      return {
        allowed: true,
        remaining: Math.min(...this.limits.map((l) => l.maxMessages)),
      };
    }

    const previous = this.pendingChecks.get(identifier) ?? Promise.resolve();
    const current = previous.then(() => this.#checkNow(identifier));
    const settled = current.catch(() => undefined);
    this.pendingChecks.set(identifier, settled);
    try {
      return await current;
    } finally {
      if (this.pendingChecks.get(identifier) === settled) {
        this.pendingChecks.delete(identifier);
      }
    }
  }

  async #checkNow(identifier: string): Promise<RateLimitResult> {
    if (this.redisClient) {
      try {
        return await this.#checkWithRedis(this.redisClient, identifier);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(
          `⚠️  RateLimiter redis fallback for ${identifier}: ${message}`,
        );
      }
    }

    return this.#checkInMemory(identifier);
  }

  async #checkWithRedis(
    client: RedisClient,
    identifier: string,
  ): Promise<RateLimitResult> {
    const key = `${this.keyPrefix}${identifier}`;
    const now = Date.now();

    const results = (await client
      .multi()
      .zRemRangeByScore(key, 0, now - this.longestWindowMs)
      .zRangeWithScores(key, 0, -1)
      .exec()) as Array<unknown> | null;
    const entries = results?.[1];
    if (!Array.isArray(entries)) {
      return this.#checkInMemory(identifier);
    }

    const timestamps = (entries as Array<{ score: number }>)
      .map((entry) => Number(entry.score))
      .filter(Number.isFinite);
    const result = evaluateRateLimits(timestamps, now, this.limits);
    if (!result.allowed) return result;

    const value = `${now}:${Math.random().toString(36).slice(2, 10)}`;
    await client
      .multi()
      .zAdd(key, [{ score: now, value }])
      .pExpire(key, this.longestWindowMs)
      .exec();
    return result;
  }

  #checkInMemory(identifier: string): RateLimitResult {
    const now = Date.now();
    const timestamps = (this.memoryStore.get(identifier) ?? []).filter(
      (timestamp) => timestamp > now - this.longestWindowMs,
    );

    const result = evaluateRateLimits(timestamps, now, this.limits);
    if (result.allowed) timestamps.push(now);
    this.memoryStore.set(identifier, timestamps);
    return result;
  }
}

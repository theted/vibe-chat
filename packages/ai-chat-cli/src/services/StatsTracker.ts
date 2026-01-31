/**
 * Stats Tracker backed by Redis
 *
 * Tracks global message counters and stores the latest messages
 * if Redis is configured. Gracefully degrades to a no-op when Redis
 * is unavailable or the dependency is not installed.
 */

import dotenv from "dotenv";
import type { RedisClientType } from "redis";

import {
  STATS_LATEST_MESSAGES_KEY,
  STATS_MAX_CONTENT_LENGTH,
  STATS_MAX_LATEST_MESSAGES,
  STATS_TOTAL_AI_MESSAGES_KEY,
  STATS_TOTAL_MESSAGES_KEY,
  STATS_TOTAL_USER_MESSAGES_KEY,
} from "@/config/statsConstants.js";

dotenv.config();

interface StatsTrackerOptions {
  clientFactory?: () => Promise<RedisClientType | null>;
}

interface MessageStats {
  role: string;
  content: string;
  provider?: string | null;
  model?: string | null;
}

interface StoredMessage {
  timestamp: string;
  role: string;
  provider: string | null;
  model: string | null;
  content: string;
}

export class StatsTracker {
  private enabled: boolean;
  private clientPromise: Promise<RedisClientType | null> | null = null;
  private initialized = false;
  private clientFactory: (() => Promise<RedisClientType | null>) | null;

  constructor(options: StatsTrackerOptions = {}) {
    this.enabled =
      !!process.env.REDIS_URL ||
      !!process.env.REDIS_HOST ||
      !!process.env.REDIS_PORT;
    this.clientFactory = options.clientFactory || null;
  }

  async getClient(): Promise<RedisClientType | null> {
    if (!this.enabled) return null;
    if (this.clientPromise) return this.clientPromise;

    this.clientPromise = this.createClient();
    return this.clientPromise;
  }

  private async createClient(): Promise<RedisClientType | null> {
    try {
      if (this.clientFactory) {
        const client = await this.clientFactory();
        if (!client) {
          this.enabled = false;
          return null;
        }
        this.initialized = true;
        return client;
      }

      const { createClient } = await import("redis");

      const url = process.env.REDIS_URL;
      const client = url
        ? createClient({ url })
        : createClient({
            socket: {
              host: process.env.REDIS_HOST || "127.0.0.1",
              port: parseInt(process.env.REDIS_PORT || "6379", 10),
            },
            password: process.env.REDIS_PASSWORD,
          });

      client.on("error", (err: Error) => {
        console.warn(`Redis stats client error: ${err.message}`);
      });

      await client.connect();
      this.initialized = true;
      console.log("Redis stats tracker connected");
      return client as RedisClientType;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.warn(`Redis stats tracker disabled: ${errorMessage}`);
      this.enabled = false;
      return null;
    }
  }

  async recordMessage({
    role,
    content,
    provider,
    model,
  }: MessageStats): Promise<void> {
    try {
      const client = await this.getClient();
      if (!client) return;

      const trimmedContent =
        typeof content === "string"
          ? content.slice(0, STATS_MAX_CONTENT_LENGTH)
          : "";

      const storedMessage: StoredMessage = {
        timestamp: new Date().toISOString(),
        role,
        provider: provider || null,
        model: model || null,
        content: trimmedContent,
      };

      const payload = JSON.stringify(storedMessage);

      const pipeline = client.multi();
      pipeline.incr(STATS_TOTAL_MESSAGES_KEY);

      if (role === "assistant") {
        pipeline.incr(STATS_TOTAL_AI_MESSAGES_KEY);
      } else if (role === "user") {
        pipeline.incr(STATS_TOTAL_USER_MESSAGES_KEY);
      }

      pipeline.lPush(STATS_LATEST_MESSAGES_KEY, payload);
      pipeline.lTrim(
        STATS_LATEST_MESSAGES_KEY,
        0,
        STATS_MAX_LATEST_MESSAGES - 1,
      );

      await pipeline.exec();
    } catch (error) {
      // Swallow errors to avoid affecting the main app flow.
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.warn(`Failed to record stats: ${errorMessage}`);
    }
  }

  /**
   * Get stats tracker status
   */
  getStatus(): { enabled: boolean; initialized: boolean } {
    return {
      enabled: this.enabled,
      initialized: this.initialized,
    };
  }

  /**
   * Disable the stats tracker
   */
  disable(): void {
    this.enabled = false;
  }
}

export const statsTracker = new StatsTracker();

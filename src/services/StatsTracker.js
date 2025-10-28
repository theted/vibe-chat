/**
 * Stats Tracker backed by Redis
 *
 * Tracks global message counters and stores the latest messages
 * if Redis is configured. Gracefully degrades to a no-op when Redis
 * is unavailable or the dependency is not installed.
 */

import dotenv from "dotenv";

dotenv.config();

const TOTAL_MESSAGES_KEY = "ai-chat:stats:messages:total";
const TOTAL_AI_MESSAGES_KEY = "ai-chat:stats:messages:ai";
const TOTAL_USER_MESSAGES_KEY = "ai-chat:stats:messages:user";
const LATEST_MESSAGES_KEY = "ai-chat:stats:messages:latest";
const MAX_LATEST_MESSAGES = 100;
const MAX_CONTENT_LENGTH = 1000;

class StatsTracker {
  constructor() {
    this.enabled =
      !!process.env.REDIS_URL ||
      !!process.env.REDIS_HOST ||
      !!process.env.REDIS_PORT;
    this.clientPromise = null;
    this.initialized = false;
  }

  async getClient() {
    if (!this.enabled) return null;
    if (this.clientPromise) return this.clientPromise;

    this.clientPromise = this.createClient();
    return this.clientPromise;
  }

  async createClient() {
    try {
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

      client.on("error", (err) => {
        console.warn(`Redis stats client error: ${err.message}`);
      });

      await client.connect();
      this.initialized = true;
      console.log("Redis stats tracker connected");
      return client;
    } catch (error) {
      console.warn(
        `Redis stats tracker disabled: ${error?.message || "Unknown error"}`
      );
      this.enabled = false;
      return null;
    }
  }

  async recordMessage({ role, content, provider, model }) {
    try {
      const client = await this.getClient();
      if (!client) return;

      const trimmedContent =
        typeof content === "string"
          ? content.slice(0, MAX_CONTENT_LENGTH)
          : "";
      const payload = JSON.stringify({
        timestamp: new Date().toISOString(),
        role,
        provider: provider || null,
        model: model || null,
        content: trimmedContent,
      });

      const pipeline = client.multi();
      pipeline.incr(TOTAL_MESSAGES_KEY);

      if (role === "assistant") {
        pipeline.incr(TOTAL_AI_MESSAGES_KEY);
      } else if (role === "user") {
        pipeline.incr(TOTAL_USER_MESSAGES_KEY);
      }

      pipeline.lPush(LATEST_MESSAGES_KEY, payload);
      pipeline.lTrim(LATEST_MESSAGES_KEY, 0, MAX_LATEST_MESSAGES - 1);

      await pipeline.exec();
    } catch (error) {
      // Swallow errors to avoid affecting the main app flow.
      console.warn(`Failed to record stats: ${error.message}`);
    }
  }
}

export const statsTracker = new StatsTracker();

import { createClient } from "redis";

export type RedisClient = ReturnType<typeof createClient>;

/**
 * Create a Redis client for metrics persistence.
 * @returns A connected Redis client, or null when REDIS_URL is missing or unavailable.
 */
export async function createRedisClient(): Promise<RedisClient | null> {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.warn("⚠️  REDIS_URL is not set. Metrics persistence is disabled.");
    return null;
  }

  const client = createClient({ url: redisUrl });

  client.on("error", (error) => {
    console.error("❌ Redis client error:", error);
  });

  try {
    await client.connect();
    console.log(`✅ Connected to Redis at ${redisUrl}`);
    return client;
  } catch (error) {
    console.error(
      "❌ Failed to connect to Redis. Continuing without persistence.",
      error
    );
    return null;
  }
}

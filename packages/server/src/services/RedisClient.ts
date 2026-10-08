import { createClient } from "redis";

export type RedisClient = ReturnType<typeof createClient>;

/** How long startup keeps trying for a first connection before running without Redis. */
const INITIAL_CONNECT_BUDGET_MS = 10_000;

/** node-redis's own default backoff between attempts. */
const reconnectDelay = (retries: number) => Math.min(retries * 50, 500);

/**
 * Create a Redis client for metrics persistence.
 * @param options.connectBudgetMs How long to keep trying for the first connection.
 * @returns A connected Redis client, or null when REDIS_URL is missing or unavailable.
 */
export async function createRedisClient({
  connectBudgetMs = INITIAL_CONNECT_BUDGET_MS,
}: { connectBudgetMs?: number } = {}): Promise<RedisClient | null> {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.warn("⚠️  REDIS_URL is not set. Metrics persistence is disabled.");
    return null;
  }

  // By default node-redis retries a failed connection forever, so `connect()` never settles while
  // Redis is down, and startServer awaits it before listening. The first connection gets a time
  // budget rather than a retry count: compose starts Redis beside the server with no depends_on,
  // and a Redis that is still booting refuses each attempt instantly. Once connected, reconnects
  // never give up, so a Redis restart doesn't switch persistence off for good.
  const giveUpAt = Date.now() + connectBudgetMs;
  let connected = false;
  const client = createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries) =>
        connected || Date.now() < giveUpAt
          ? reconnectDelay(retries)
          : new Error(`No connection within ${connectBudgetMs} ms`),
    },
  });

  client.on("ready", () => {
    connected = true;
  });
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
      error,
    );
    return null;
  }
}

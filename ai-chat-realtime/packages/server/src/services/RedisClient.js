/**
 * Redis Client Factory
 * Provides a reusable Redis client for persisting runtime metrics.
 */

import { createClient } from 'redis';

export async function createRedisClient() {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.warn('⚠️  REDIS_URL is not set. Metrics persistence is disabled.');
    return null;
  }

  const client = createClient({ url: redisUrl });

  client.on('error', (error) => {
    console.error('❌ Redis client error:', error);
  });

  try {
    await client.connect();
    console.log(`✅ Connected to Redis at ${redisUrl}`);
    return client;
  } catch (error) {
    console.error('❌ Failed to connect to Redis. Continuing without persistence.', error);
    return null;
  }
}

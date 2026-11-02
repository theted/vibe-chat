/**
 * Probes for the services chat depends on, reported by /health/detailed.
 * Every probe is time-boxed, so a hung dependency fails the check instead of
 * hanging the request.
 */

import { withTimeout } from "@/utils/promiseUtils.js";
import type { RedisClient } from "./RedisClient.js";

export const DEPENDENCY_CHECK_TIMEOUT_MS = 2_000;
const CHROMA_HEARTBEAT_PATH = "/api/v2/heartbeat";

export type DependencyState = "up" | "down" | "disabled";

export type DependencyStatus = {
  status: DependencyState;
  latencyMs?: number;
  /** A short reason only: the endpoint is public, so no hosts or stack traces. */
  error?: string;
};

export type DependencyCheck = () => Promise<DependencyStatus>;

type CheckOptions = { timeoutMs?: number };

const runProbe = async (
  probe: () => Promise<void>,
  timeoutMs: number,
): Promise<DependencyStatus> => {
  const startedAt = Date.now();
  try {
    await withTimeout(probe(), timeoutMs, `timed out after ${timeoutMs}ms`);
    return { status: "up", latencyMs: Date.now() - startedAt };
  } catch (error) {
    return {
      status: "down",
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

/**
 * Pings Redis.
 * @param client The server's Redis client; null when startup couldn't connect.
 * @param options.configured Whether REDIS_URL is set. When it isn't, Redis is
 *   reported as disabled rather than down.
 */
export const checkRedis = (
  client: RedisClient | null | undefined,
  {
    configured = true,
    timeoutMs = DEPENDENCY_CHECK_TIMEOUT_MS,
  }: CheckOptions & { configured?: boolean } = {},
): Promise<DependencyStatus> => {
  if (!configured) return Promise.resolve({ status: "disabled" });

  return runProbe(async () => {
    // Startup gives up on Redis after its connect budget and never retries,
    // so a missing client stays down until the server restarts
    if (!client?.isReady) throw new Error("not connected");
    await client.ping();
  }, timeoutMs);
};

/**
 * Calls Chroma's heartbeat endpoint.
 * @param chromaUrl CHROMA_URL; when unset, Chroma is reported as disabled.
 */
export const checkChroma = (
  chromaUrl: string | undefined,
  { timeoutMs = DEPENDENCY_CHECK_TIMEOUT_MS }: CheckOptions = {},
): Promise<DependencyStatus> => {
  if (!chromaUrl) return Promise.resolve({ status: "disabled" });

  return runProbe(async () => {
    let response: Response;
    try {
      response = await fetch(new URL(CHROMA_HEARTBEAT_PATH, chromaUrl), {
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new Error("unreachable");
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  }, timeoutMs);
};

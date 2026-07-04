import type {
  MessageHistoryEntry,
  MetricsSnapshot,
  ProviderErrorLogEntry,
} from "@/types.js";
import type { RedisClient } from "./RedisClient.js";
import {
  getProviderStatsPersistenceSnapshot,
  pruneMessageHistory,
  sanitizeErrorLogs,
  sanitizeMessageHistory,
  sanitizeProviderStats,
  type ProviderModelStatsInternal,
} from "./metricsUtils.js";

export type MetricsRedisKeys = {
  metrics: string;
  history: string;
  providerStats: string;
  errorLogs: string;
};

export type MetricsState = {
  metrics: MetricsSnapshot;
  messageHistory: MessageHistoryEntry[];
  providerStats: Map<string, ProviderModelStatsInternal>;
  errorLogs: ProviderErrorLogEntry[];
};

export const loadMetricsState = async (
  redis: RedisClient,
  redisKeys: MetricsRedisKeys,
  currentMetrics: MetricsSnapshot,
  maxErrorLogs: number,
): Promise<MetricsState> => {
  const [metricsJson, historyJson, providerStatsJson, errorLogsJson] =
    await Promise.all([
      redis.get(redisKeys.metrics),
      redis.get(redisKeys.history),
      redis.get(redisKeys.providerStats),
      redis.get(redisKeys.errorLogs),
    ]);

  const metrics = metricsJson
    ? { ...currentMetrics, ...JSON.parse(metricsJson) }
    : currentMetrics;
  metrics.activeUsers = 0;
  metrics.activeRooms = 0;

  return {
    metrics,
    messageHistory: historyJson
      ? pruneMessageHistory(sanitizeMessageHistory(JSON.parse(historyJson)))
      : [],
    providerStats: providerStatsJson
      ? sanitizeProviderStats(JSON.parse(providerStatsJson))
      : new Map(),
    errorLogs: errorLogsJson
      ? sanitizeErrorLogs(JSON.parse(errorLogsJson), maxErrorLogs)
      : [],
  };
};

export const persistMetricsState = (
  redis: RedisClient,
  redisKeys: MetricsRedisKeys,
  state: MetricsState,
): Promise<void> =>
  Promise.all([
    redis.set(redisKeys.metrics, JSON.stringify(state.metrics)),
    redis.set(redisKeys.history, JSON.stringify(state.messageHistory)),
    redis.set(
      redisKeys.providerStats,
      JSON.stringify(getProviderStatsPersistenceSnapshot(state.providerStats)),
    ),
    redis.set(redisKeys.errorLogs, JSON.stringify(state.errorLogs)),
  ]).then(() => undefined);

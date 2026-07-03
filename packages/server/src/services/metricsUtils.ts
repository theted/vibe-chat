import type {
  MessageHistoryEntry,
  MetricsHistoryEntry,
  MetricsSnapshot,
  ProviderErrorLogEntry,
  ProviderModelStats,
} from "@/types.js";

export type MetricsBucket = {
  aiMessages: number;
  userMessages: number;
  totalMessages: number;
};

export type ProviderModelStatsInternal = {
  provider: string;
  model: string;
  requests: number;
  errors: number;
  totalResponseTimeMs: number;
};

export const DEFAULT_MAX_ERROR_LOGS = 200;
export const MESSAGE_HISTORY_WINDOW_MS = 60 * 60 * 1000;
export const MESSAGE_RATE_WINDOW_MS = 60 * 1000;
export const METRICS_HISTORY_INTERVAL_MS = 5 * 60 * 1000;

export const createEmptyMetrics = (
  activeUsers = 0,
  activeRooms = 0,
): MetricsSnapshot => ({
  totalAIMessages: 0,
  totalUserMessages: 0,
  totalMessages: 0,
  messagesPerMinute: 0,
  activeUsers,
  activeRooms,
});

export const buildProviderKey = (provider: string, model: string): string =>
  `${provider}::${model}`;

export const createProviderStatsEntry = (
  provider: string,
  model: string,
): ProviderModelStatsInternal => ({
  provider,
  model,
  requests: 0,
  errors: 0,
  totalResponseTimeMs: 0,
});

export const recordProviderMetric = (
  providerStats: Map<string, ProviderModelStatsInternal>,
  params: {
    providerKey?: string;
    modelKey?: string;
    responseTimeMs?: number;
    isError?: boolean;
  },
): ProviderModelStatsInternal => {
  const provider = params.providerKey || "unknown";
  const model = params.modelKey || "unknown";
  const key = buildProviderKey(provider, model);
  const current =
    providerStats.get(key) || createProviderStatsEntry(provider, model);

  current.requests += 1;
  current.errors += params.isError ? 1 : 0;
  current.totalResponseTimeMs += Number(params.responseTimeMs) || 0;
  providerStats.set(key, current);

  return current;
};

export const sortProviderStats = <
  T extends { provider: string; model: string },
>(
  stats: T[],
): T[] =>
  stats.sort(
    (a, b) =>
      a.provider.localeCompare(b.provider) || a.model.localeCompare(b.model),
  );

export const getProviderStatsSnapshot = (
  providerStats: Map<string, ProviderModelStatsInternal>,
): ProviderModelStats[] =>
  sortProviderStats(
    Array.from(providerStats.values()).map((entry) => ({
      provider: entry.provider,
      model: entry.model,
      requests: entry.requests,
      errors: entry.errors,
      meanResponseTimeMs:
        entry.requests > 0
          ? Math.round(entry.totalResponseTimeMs / entry.requests)
          : 0,
    })),
  );

export const getProviderStatsPersistenceSnapshot = (
  providerStats: Map<string, ProviderModelStatsInternal>,
): ProviderModelStatsInternal[] =>
  sortProviderStats(
    Array.from(providerStats.values()).map((entry) => ({ ...entry })),
  );

export const sanitizeMessageHistory = (
  parsedHistory: unknown,
): MessageHistoryEntry[] => {
  if (!Array.isArray(parsedHistory)) {
    return [];
  }

  return parsedHistory.filter(
    (entry): entry is MessageHistoryEntry =>
      entry &&
      typeof entry.timestamp === "number" &&
      (entry.type === "ai" || entry.type === "user"),
  );
};

export const sanitizeErrorLogs = (
  parsedErrorLogs: unknown,
  maxErrorLogs: number,
): ProviderErrorLogEntry[] => {
  if (!Array.isArray(parsedErrorLogs)) {
    return [];
  }

  return parsedErrorLogs
    .filter(
      (entry): entry is ProviderErrorLogEntry =>
        entry &&
        typeof entry.provider === "string" &&
        typeof entry.model === "string" &&
        typeof entry.message === "string" &&
        typeof entry.timestamp === "number",
    )
    .slice(0, maxErrorLogs);
};

export const sanitizeProviderStats = (
  parsedProviderStats: unknown,
): Map<string, ProviderModelStatsInternal> => {
  const providerStats = new Map<string, ProviderModelStatsInternal>();

  if (!Array.isArray(parsedProviderStats)) {
    return providerStats;
  }

  for (const entry of parsedProviderStats) {
    if (
      !entry ||
      typeof entry.provider !== "string" ||
      typeof entry.model !== "string"
    ) {
      continue;
    }

    providerStats.set(buildProviderKey(entry.provider, entry.model), {
      provider: entry.provider,
      model: entry.model,
      requests: Number(entry.requests) || 0,
      errors: Number(entry.errors) || 0,
      totalResponseTimeMs: Number(entry.totalResponseTimeMs) || 0,
    });
  }

  return providerStats;
};

export const pruneMessageHistory = (
  messageHistory: MessageHistoryEntry[],
  windowMs = MESSAGE_HISTORY_WINDOW_MS,
  referenceTimestamp = Date.now(),
): MessageHistoryEntry[] => {
  const cutoff = referenceTimestamp - windowMs;
  return messageHistory.filter((message) => message.timestamp > cutoff);
};

export const getMessagesPerMinute = (
  messageHistory: MessageHistoryEntry[],
  now = Date.now(),
): number => {
  const oneMinuteAgo = now - MESSAGE_RATE_WINDOW_MS;
  return messageHistory.filter((message) => message.timestamp > oneMinuteAgo)
    .length;
};

export const countMessagesByType = (
  messageHistory: MessageHistoryEntry[],
  startTimestamp: number,
): MetricsBucket => {
  const bucket = { aiMessages: 0, userMessages: 0, totalMessages: 0 };

  for (const message of messageHistory) {
    if (message.timestamp <= startTimestamp) {
      continue;
    }

    if (message.type === "ai") {
      bucket.aiMessages += 1;
    } else {
      bucket.userMessages += 1;
    }
  }

  bucket.totalMessages = bucket.aiMessages + bucket.userMessages;
  return bucket;
};

export const createMetricsHistory = (
  messageHistory: MessageHistoryEntry[],
  duration = MESSAGE_HISTORY_WINDOW_MS,
  now = Date.now(),
): MetricsHistoryEntry[] => {
  const startTime = now - duration;
  const intervals = Math.ceil(duration / METRICS_HISTORY_INTERVAL_MS);

  return Array.from({ length: intervals }, (_, index) => {
    const intervalStart = startTime + index * METRICS_HISTORY_INTERVAL_MS;
    const intervalEnd = intervalStart + METRICS_HISTORY_INTERVAL_MS;
    const intervalMessages = messageHistory.filter(
      (message) =>
        message.timestamp >= intervalStart && message.timestamp < intervalEnd,
    );
    const bucket = countMessagesByType(intervalMessages, 0);

    return {
      timestamp: intervalStart,
      aiMessages: bucket.aiMessages,
      userMessages: bucket.userMessages,
      totalMessages: bucket.totalMessages,
    };
  });
};

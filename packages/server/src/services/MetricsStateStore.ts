import type {
  MessageHistoryEntry,
  MetricsHistoryEntry,
  MetricsSnapshot,
  ProviderErrorLogEntry,
} from "@/types.js";
import {
  countMessagesByType,
  createEmptyMetrics,
  createMetricsHistory,
  DEFAULT_MAX_ERROR_LOGS,
  getMessagesPerMinute,
  getProviderStatsSnapshot,
  MESSAGE_HISTORY_WINDOW_MS,
  pruneMessageHistory,
  recordProviderMetric,
  type MetricsBucket,
  type ProviderModelStatsInternal,
} from "./metricsUtils.js";
import type { MetricsState } from "./metricsPersistence.js";

export class MetricsStateStore {
  private metrics: MetricsSnapshot;
  private messageHistory: MessageHistoryEntry[];
  private providerStats: Map<string, ProviderModelStatsInternal>;
  private errorLogs: ProviderErrorLogEntry[];
  readonly maxErrorLogs: number;

  constructor(maxErrorLogs = DEFAULT_MAX_ERROR_LOGS) {
    this.metrics = createEmptyMetrics();
    this.messageHistory = [];
    this.providerStats = new Map();
    this.errorLogs = [];
    this.maxErrorLogs = maxErrorLogs;
  }

  get currentMetrics(): MetricsSnapshot {
    return this.metrics;
  }

  getPersistenceState(): MetricsState {
    return {
      metrics: this.metrics,
      messageHistory: this.messageHistory,
      providerStats: this.providerStats,
      errorLogs: this.errorLogs,
    };
  }

  hydrate(state: MetricsState): void {
    this.metrics = state.metrics;
    this.messageHistory = state.messageHistory;
    this.providerStats = state.providerStats;
    this.errorLogs = state.errorLogs;
    this.updateMessagesPerMinute();
  }

  recordAIMessage(): void {
    this.metrics.totalAIMessages++;
    this.metrics.totalMessages++;
    this.addMessageToHistory("ai", Date.now());
    this.updateMessagesPerMinute();
  }

  recordUserMessage(): void {
    this.metrics.totalUserMessages++;
    this.metrics.totalMessages++;
    this.addMessageToHistory("user", Date.now());
    this.updateMessagesPerMinute();
  }

  recordAIResponse(params: {
    providerKey?: string;
    modelKey?: string;
    responseTimeMs?: number;
  }): void {
    recordProviderMetric(this.providerStats, params);
  }

  recordAIError(params: {
    providerKey?: string;
    modelKey?: string;
    responseTimeMs?: number;
    errorMessage?: string;
  }): void {
    const stats = recordProviderMetric(this.providerStats, {
      ...params,
      isError: true,
    });

    if (!params.errorMessage) {
      return;
    }

    this.errorLogs.unshift({
      provider: stats.provider,
      model: stats.model,
      message: params.errorMessage,
      timestamp: Date.now(),
    });
    if (this.errorLogs.length > this.maxErrorLogs) {
      this.errorLogs.length = this.maxErrorLogs;
    }
  }

  addMessageToHistory(
    type: MessageHistoryEntry["type"],
    timestamp: number,
  ): void {
    this.messageHistory.push({ type, timestamp });
    this.pruneMessageHistory(MESSAGE_HISTORY_WINDOW_MS, timestamp);
  }

  pruneMessageHistory(
    windowMs = MESSAGE_HISTORY_WINDOW_MS,
    referenceTimestamp = Date.now(),
  ): void {
    this.messageHistory = pruneMessageHistory(
      this.messageHistory,
      windowMs,
      referenceTimestamp,
    );
  }

  updateMessagesPerMinute(): void {
    this.metrics.messagesPerMinute = getMessagesPerMinute(this.messageHistory);
  }

  updateActiveUsers(count: number): void {
    this.metrics.activeUsers = count;
  }

  updateActiveRooms(count: number): void {
    this.metrics.activeRooms = count;
  }

  getMetrics(): MetricsSnapshot & { timestamp: number; uptime: number } {
    this.updateMessagesPerMinute();
    return {
      ...this.metrics,
      timestamp: Date.now(),
      uptime: process.uptime(),
      providerModelStats: getProviderStatsSnapshot(this.providerStats),
      errorLogs: this.errorLogs,
    };
  }

  getDetailedMetrics(): MetricsSnapshot & {
    timestamp: number;
    uptime: number;
    hourly: MetricsBucket;
    daily: MetricsBucket;
  } {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    return {
      ...this.getMetrics(),
      hourly: countMessagesByType(this.messageHistory, oneHourAgo),
      daily: countMessagesByType(this.messageHistory, oneDayAgo),
      providerModelStats: getProviderStatsSnapshot(this.providerStats),
      errorLogs: this.errorLogs,
    };
  }

  resetMetrics(): void {
    this.metrics = createEmptyMetrics(
      this.metrics.activeUsers,
      this.metrics.activeRooms,
    );
    this.messageHistory = [];
    this.providerStats = new Map();
    this.errorLogs = [];
  }

  getMetricsHistory(
    duration = MESSAGE_HISTORY_WINDOW_MS,
  ): MetricsHistoryEntry[] {
    return createMetricsHistory(this.messageHistory, duration);
  }
}

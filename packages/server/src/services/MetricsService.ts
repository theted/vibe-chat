import { EventEmitter } from "events";
import type { Server } from "socket.io";
import { SOCKET_EVENTS } from "@ai-chat/ai-configs";

import type {
  MessageHistoryEntry,
  MetricsHistoryEntry,
  MetricsSnapshot,
} from "@/types.js";
import type { RedisClient } from "./RedisClient.js";
import type { MetricsBucket } from "./metricsUtils.js";
import {
  loadMetricsState,
  persistMetricsState,
  type MetricsRedisKeys,
} from "./metricsPersistence.js";
import { MetricsStateStore } from "./MetricsStateStore.js";

type MetricsServiceOptions = {
  redisClient?: RedisClient | null;
  metricsKey?: string;
  historyKey?: string;
};

/**
 * Tracks chat metrics and emits updates to connected clients.
 */
export class MetricsService extends EventEmitter {
  private io: Server;
  private redis: RedisClient | null;
  private redisKeys: MetricsRedisKeys;
  private store: MetricsStateStore;
  private lastBroadcast: number;
  private broadcastInterval: number;
  private persistenceThrottleMs: number;
  private lastPersist: number;
  private pendingPersistTimeout: NodeJS.Timeout | null;

  constructor(io: Server, options: MetricsServiceOptions = {}) {
    super();
    this.io = io;
    this.redis = options.redisClient ?? null;
    this.redisKeys = {
      metrics: options.metricsKey || "metrics-service:metrics",
      history: options.historyKey || "metrics-service:history",
      providerStats: "metrics-service:provider-stats",
      errorLogs: "metrics-service:error-logs",
    };
    this.store = new MetricsStateStore();
    this.lastBroadcast = Date.now();
    this.broadcastInterval = 2000;
    this.persistenceThrottleMs = 1000;
    this.lastPersist = 0;
    this.pendingPersistTimeout = null;

    this.startMetricsBroadcast();
  }

  async initialize(): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      const state = await loadMetricsState(
        this.redis,
        this.redisKeys,
        this.store.currentMetrics,
        this.store.maxErrorLogs,
      );
      this.store.hydrate(state);
      this.lastPersist = Date.now();
    } catch (error) {
      console.error("⚠️  Failed to load metrics from Redis:", error);
    }
  }

  markDirty(): void {
    if (!this.redis) {
      return;
    }

    const now = Date.now();
    const elapsed = now - this.lastPersist;

    if (elapsed >= this.persistenceThrottleMs) {
      this.flushPersistence();
      return;
    }

    if (this.pendingPersistTimeout) {
      return;
    }

    const delay = Math.max(this.persistenceThrottleMs - elapsed, 50);
    this.pendingPersistTimeout = setTimeout(() => {
      this.pendingPersistTimeout = null;
      this.flushPersistence();
    }, delay);
  }

  flushPersistence(): Promise<void> | undefined {
    if (!this.redis) {
      return;
    }

    if (this.pendingPersistTimeout) {
      clearTimeout(this.pendingPersistTimeout);
      this.pendingPersistTimeout = null;
    }

    this.lastPersist = Date.now();

    return persistMetricsState(
      this.redis,
      this.redisKeys,
      this.store.getPersistenceState(),
    ).catch((error) => {
      console.error("⚠️  Failed to persist metrics to Redis:", error);
      this.lastPersist = 0;
    });
  }

  recordAIMessage(roomId: string, aiId: string, message: unknown): void {
    this.store.recordAIMessage();
    this.markDirty();
    this.broadcastMetrics();
  }

  recordAIResponse(params: {
    providerKey?: string;
    modelKey?: string;
    responseTimeMs?: number;
  }): void {
    this.store.recordAIResponse(params);
    this.markDirty();
    this.broadcastMetrics();
  }

  recordAIError(params: {
    providerKey?: string;
    modelKey?: string;
    responseTimeMs?: number;
    errorMessage?: string;
  }): void {
    this.store.recordAIError(params);
    this.markDirty();
    this.broadcastMetrics();
  }

  recordUserMessage(roomId: string, username: string, message: unknown): void {
    this.store.recordUserMessage();
    this.markDirty();
    this.broadcastMetrics();
  }

  addMessageToHistory(
    type: MessageHistoryEntry["type"],
    timestamp: number,
  ): void {
    this.store.addMessageToHistory(type, timestamp);
  }

  pruneMessageHistory(
    windowMs = 60 * 60 * 1000,
    referenceTimestamp = Date.now(),
  ): void {
    this.store.pruneMessageHistory(windowMs, referenceTimestamp);
  }

  updateMessagesPerMinute(): void {
    this.store.updateMessagesPerMinute();
  }

  updateActiveUsers(count: number): void {
    this.store.updateActiveUsers(count);
    this.markDirty();
    this.broadcastMetrics();
  }

  updateActiveRooms(count: number): void {
    this.store.updateActiveRooms(count);
    this.markDirty();
    this.broadcastMetrics();
  }

  getMetrics(): MetricsSnapshot & { timestamp: number; uptime: number } {
    return this.store.getMetrics();
  }

  getDetailedMetrics(): MetricsSnapshot & {
    timestamp: number;
    uptime: number;
    hourly: MetricsBucket;
    daily: MetricsBucket;
  } {
    return this.store.getDetailedMetrics();
  }

  resetMetrics(): void {
    this.store.resetMetrics();
    this.markDirty();
    this.broadcastMetrics();
  }

  broadcastMetrics(): void {
    const now = Date.now();
    if (now - this.lastBroadcast < this.broadcastInterval) {
      return;
    }

    this.lastBroadcast = now;
    const metrics = this.getMetrics();
    this.io.emit(SOCKET_EVENTS.METRICS_UPDATE, metrics);
    this.io.to("dashboard").emit(SOCKET_EVENTS.METRICS_UPDATE, metrics);
  }

  startMetricsBroadcast(): void {
    setInterval(() => {
      this.broadcastMetrics();
    }, 5000);
  }

  getMetricsHistory(duration = 60 * 60 * 1000): MetricsHistoryEntry[] {
    return this.store.getMetricsHistory(duration);
  }
}

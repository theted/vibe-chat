/**
 * Metrics Service - Tracks comprehensive chat metrics and emits to Redis/WebSocket
 */

import { EventEmitter } from "events";
import type { Server } from "socket.io";

import type {
  MessageHistoryEntry,
  MetricsHistoryEntry,
  MetricsSnapshot,
} from "../types.js";
import type { RedisClient } from "./RedisClient.js";

type MetricsServiceOptions = {
  redisClient?: RedisClient | null;
  metricsKey?: string;
  historyKey?: string;
};

type MetricsBucket = {
  aiMessages: number;
  userMessages: number;
  totalMessages: number;
};

/**
 * Tracks chat metrics and emits updates to connected clients.
 */
export class MetricsService extends EventEmitter {
  private io: Server;
  private redis: RedisClient | null;
  private redisKeys: { metrics: string; history: string };
  private metrics: MetricsSnapshot;
  private messageHistory: MessageHistoryEntry[];
  private lastBroadcast: number;
  private broadcastInterval: number;
  private persistenceThrottleMs: number;
  private lastPersist: number;
  private pendingPersistTimeout: NodeJS.Timeout | null;

  /**
   * Create a metrics service instance.
   * @param io - Socket.IO server instance.
   * @param options - Optional Redis configuration for persistence.
   */
  constructor(io: Server, options: MetricsServiceOptions = {}) {
    super();
    this.io = io;
    this.redis = options.redisClient ?? null;
    this.redisKeys = {
      metrics: options.metricsKey || "metrics-service:metrics",
      history: options.historyKey || "metrics-service:history",
    };
    this.metrics = {
      totalAIMessages: 0,
      totalUserMessages: 0,
      totalMessages: 0,
      messagesPerMinute: 0,
      activeUsers: 0,
      activeRooms: 0,
    };

    this.messageHistory = []; // Store last hour of message timestamps
    this.lastBroadcast = Date.now();
    this.broadcastInterval = 2000; // Broadcast every 2 seconds
    this.persistenceThrottleMs = 1000;
    this.lastPersist = 0;
    this.pendingPersistTimeout = null;
    
    this.startMetricsBroadcast();
  }

  /**
   * Initialize metrics from Redis
   */
  async initialize(): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      const [metricsJson, historyJson] = await Promise.all([
        this.redis.get(this.redisKeys.metrics),
        this.redis.get(this.redisKeys.history)
      ]);

      if (metricsJson) {
        const parsedMetrics = JSON.parse(metricsJson);
        this.metrics = {
          ...this.metrics,
          ...parsedMetrics
        };
        this.metrics.activeUsers = 0;
        this.metrics.activeRooms = 0;
      }

      if (historyJson) {
        const parsedHistory = JSON.parse(historyJson);
        if (Array.isArray(parsedHistory)) {
          this.messageHistory = parsedHistory.filter(
            (entry) =>
              entry &&
              typeof entry.timestamp === "number" &&
              typeof entry.type === "string"
          );
          this.pruneMessageHistory();
        }
      }

      this.updateMessagesPerMinute();
      this.lastPersist = Date.now();
    } catch (error) {
      console.error("⚠️  Failed to load metrics from Redis:", error);
    }
  }

  /**
   * Schedule metrics persistence to Redis with throttling
   */
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

  /**
   * Persist metrics and history to Redis immediately
   */
  flushPersistence(): Promise<void> | undefined {
    if (!this.redis) {
      return;
    }

    if (this.pendingPersistTimeout) {
      clearTimeout(this.pendingPersistTimeout);
      this.pendingPersistTimeout = null;
    }

    const persistTime = Date.now();
    this.lastPersist = persistTime;

    return Promise.all([
      this.redis.set(this.redisKeys.metrics, JSON.stringify(this.metrics)),
      this.redis.set(
        this.redisKeys.history,
        JSON.stringify(this.messageHistory)
      ),
    ])
      .then(() => undefined)
      .catch((error) => {
        console.error("⚠️  Failed to persist metrics to Redis:", error);
        this.lastPersist = 0;
      });
  }

  /**
   * Record an AI message
   * @param {string} roomId - Room identifier
   * @param {string} aiId - AI identifier
   * @param {Object} message - Message object
   */
  recordAIMessage(roomId: string, aiId: string, message: unknown): void {
    this.metrics.totalAIMessages++;
    this.metrics.totalMessages++;
    this.addMessageToHistory("ai", Date.now());
    this.updateMessagesPerMinute();
    this.markDirty();
    this.broadcastMetrics();
  }

  /**
   * Record a user message
   * @param {string} roomId - Room identifier
   * @param {string} username - Username
   * @param {Object} message - Message object
   */
  recordUserMessage(roomId: string, username: string, message: unknown): void {
    this.metrics.totalUserMessages++;
    this.metrics.totalMessages++;
    this.addMessageToHistory("user", Date.now());
    this.updateMessagesPerMinute();
    this.markDirty();
    this.broadcastMetrics();
  }

  /**
   * Add message to history for rate calculations
   * @param {string} type - Message type ('user' or 'ai')
   * @param {number} timestamp - Message timestamp
   */
  addMessageToHistory(type: MessageHistoryEntry["type"], timestamp: number): void {
    this.messageHistory.push({ type, timestamp });
    this.pruneMessageHistory(60 * 60 * 1000, timestamp);
  }

  /**
   * Trim message history to a moving window
   * @param {number} windowMs - Window size in milliseconds
   * @param {number} referenceTimestamp - Reference timestamp for trimming
   */
  pruneMessageHistory(
    windowMs = 60 * 60 * 1000,
    referenceTimestamp = Date.now()
  ): void {
    const cutoff = referenceTimestamp - windowMs;
    this.messageHistory = this.messageHistory.filter(
      (msg) => msg.timestamp > cutoff
    );
  }

  /**
   * Update messages per minute calculation
   */
  updateMessagesPerMinute(): void {
    const oneMinuteAgo = Date.now() - (60 * 1000);
    const recentMessages = this.messageHistory.filter(
      (msg) => msg.timestamp > oneMinuteAgo
    );
    this.metrics.messagesPerMinute = recentMessages.length;
  }

  /**
   * Update active users count
   * @param {number} count - Number of active users
   */
  updateActiveUsers(count: number): void {
    this.metrics.activeUsers = count;
    this.markDirty();
    this.broadcastMetrics();
  }

  /**
   * Update active rooms count
   * @param {number} count - Number of active rooms
   */
  updateActiveRooms(count: number): void {
    this.metrics.activeRooms = count;
    this.markDirty();
    this.broadcastMetrics();
  }

  /**
   * Get current metrics
   * @returns {Object} Current metrics
   */
  getMetrics(): MetricsSnapshot & { timestamp: number; uptime: number } {
    this.updateMessagesPerMinute();
    return {
      ...this.metrics,
      timestamp: Date.now(),
      uptime: process.uptime(),
    };
  }

  /**
   * Get detailed metrics with breakdown
   * @returns {Object} Detailed metrics
   */
  getDetailedMetrics(): MetricsSnapshot & {
    timestamp: number;
    uptime: number;
    hourly: MetricsBucket;
    daily: MetricsBucket;
  } {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    const recentMessages = this.messageHistory.filter(
      (msg) => msg.timestamp > oneHourAgo
    );
    const dailyMessages = this.messageHistory.filter(
      (msg) => msg.timestamp > oneDayAgo
    );
    
    const hourlyAIMessages = recentMessages.filter(
      (msg) => msg.type === "ai"
    ).length;
    const hourlyUserMessages = recentMessages.filter(
      (msg) => msg.type === "user"
    ).length;
    
    const dailyAIMessages = dailyMessages.filter(
      (msg) => msg.type === "ai"
    ).length;
    const dailyUserMessages = dailyMessages.filter(
      (msg) => msg.type === "user"
    ).length;

    return {
      ...this.getMetrics(),
      hourly: {
        aiMessages: hourlyAIMessages,
        userMessages: hourlyUserMessages,
        totalMessages: hourlyAIMessages + hourlyUserMessages,
      },
      daily: {
        aiMessages: dailyAIMessages,
        userMessages: dailyUserMessages,
        totalMessages: dailyAIMessages + dailyUserMessages,
      },
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalAIMessages: 0,
      totalUserMessages: 0,
      totalMessages: 0,
      messagesPerMinute: 0,
      activeUsers: this.metrics.activeUsers,
      activeRooms: this.metrics.activeRooms,
    };
    this.messageHistory = [];
    this.markDirty();
    this.broadcastMetrics();
  }

  /**
   * Broadcast metrics to all connected clients
   */
  broadcastMetrics(): void {
    const now = Date.now();
    if (now - this.lastBroadcast < this.broadcastInterval) {
      return; // Rate limit broadcasts
    }
    
    this.lastBroadcast = now;
    const metrics = this.getMetrics();
    
    // Emit to dashboard route specifically
    this.io.emit("metrics-update", metrics);
    
    // Also emit to any room that wants metrics
    this.io.to("dashboard").emit("metrics-update", metrics);
  }

  /**
   * Start periodic metrics broadcast
   */
  startMetricsBroadcast(): void {
    setInterval(() => {
      this.broadcastMetrics();
    }, 5000); // Broadcast every 5 seconds
  }

  /**
   * Get metrics history for charts
   * @param {number} duration - Duration in milliseconds
   * @returns {Array} Array of metrics snapshots
   */
  getMetricsHistory(duration = 60 * 60 * 1000): MetricsHistoryEntry[] {
    const now = Date.now();
    const startTime = now - duration;
    
    // Group messages by 5-minute intervals
    const intervalMs = 5 * 60 * 1000; // 5 minutes
    const intervals = Math.ceil(duration / intervalMs);
    const history: MetricsHistoryEntry[] = [];
    
    for (let i = 0; i < intervals; i++) {
      const intervalStart = startTime + (i * intervalMs);
      const intervalEnd = intervalStart + intervalMs;
      
      const intervalMessages = this.messageHistory.filter(
        (msg) => msg.timestamp >= intervalStart && msg.timestamp < intervalEnd
      );
      
      const aiMessages = intervalMessages.filter((msg) => msg.type === "ai")
        .length;
      const userMessages = intervalMessages.filter(
        (msg) => msg.type === "user"
      ).length;
      
      history.push({
        timestamp: intervalStart,
        aiMessages,
        userMessages,
        totalMessages: aiMessages + userMessages,
      });
    }
    
    return history;
  }
}

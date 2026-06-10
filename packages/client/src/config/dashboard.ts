/**
 * Dashboard configuration: refresh cadence, activity-level thresholds,
 * shared card styles, and initial metrics state.
 */

import type { DashboardMetrics } from "@/types";

export const METRICS_REFRESH_INTERVAL_MS = 30_000;
export const METRICS_HISTORY_DURATION_MS = 60 * 60 * 1000;

const ACTIVITY_VERY_HIGH_THRESHOLD = 10;
const ACTIVITY_HIGH_THRESHOLD = 5;
const ACTIVITY_MODERATE_THRESHOLD = 1;

const ACTIVITY_LEVELS = [
  { threshold: ACTIVITY_VERY_HIGH_THRESHOLD, label: "Very High", className: "text-red-600" },
  { threshold: ACTIVITY_HIGH_THRESHOLD, label: "High", className: "text-orange-600" },
  { threshold: ACTIVITY_MODERATE_THRESHOLD, label: "Moderate", className: "text-green-600" },
] as const;

const ACTIVITY_LEVEL_DEFAULT = { label: "Low", className: "text-gray-600" } as const;

export const resolveActivityLevel = (messagesPerMinute: number) =>
  ACTIVITY_LEVELS.find((level) => messagesPerMinute > level.threshold) ??
  ACTIVITY_LEVEL_DEFAULT;

export const DASHBOARD_STYLES = {
  card: "bg-white rounded-2xl p-6 shadow-md border border-gray-200",
  cardTitle: "text-xl font-semibold text-gray-900 mb-6",
  headerPill: "bg-white rounded-lg px-4 py-2 shadow-sm",
} as const;

export const INITIAL_METRICS: DashboardMetrics = {
  totalAIMessages: 0,
  totalUserMessages: 0,
  totalMessages: 0,
  messagesPerMinute: 0,
  activeUsers: 0,
  activeRooms: 0,
  providerModelStats: [],
  errorLogs: [],
  uptime: 0,
  timestamp: Date.now(),
};

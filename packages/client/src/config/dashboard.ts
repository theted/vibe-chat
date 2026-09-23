/**
 * Dashboard configuration: refresh cadence, activity-level thresholds,
 * shared panel styles, status tones, and initial metrics state.
 */

import type { DashboardMetrics } from "@/types";

export const METRICS_REFRESH_INTERVAL_MS = 30_000;
export const METRICS_HISTORY_DURATION_MS = 60 * 60 * 1000;

const ACTIVITY_VERY_HIGH_THRESHOLD = 10;
const ACTIVITY_HIGH_THRESHOLD = 5;
const ACTIVITY_MODERATE_THRESHOLD = 1;

const ACTIVITY_LEVELS = [
  {
    threshold: ACTIVITY_VERY_HIGH_THRESHOLD,
    label: "Very high",
    className: "text-danger",
  },
  {
    threshold: ACTIVITY_HIGH_THRESHOLD,
    label: "High",
    className: "text-accent",
  },
  {
    threshold: ACTIVITY_MODERATE_THRESHOLD,
    label: "Moderate",
    className: "text-fg",
  },
] as const;

const ACTIVITY_LEVEL_DEFAULT = {
  label: "Low",
  className: "text-muted",
} as const;

export const resolveActivityLevel = (messagesPerMinute: number) =>
  ACTIVITY_LEVELS.find((level) => messagesPerMinute > level.threshold) ??
  ACTIVITY_LEVEL_DEFAULT;

export const DASHBOARD_STYLES = {
  panel: "rounded-xl border border-line bg-surface",
  sectionTitle: "font-display text-base font-bold text-fg",
} as const;

// Status rows: dot colour per state, full class names for Tailwind's scanner
export const STATUS_DOT_CLASSES = {
  ok: "bg-emerald-400",
  warn: "bg-accent",
  down: "bg-danger animate-pulse",
} as const;

export type StatusTone = keyof typeof STATUS_DOT_CLASSES;

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

/**
 * Shared formatting utilities for dashboard and metrics display
 */

export const formatUptime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours}h ${minutes}m ${secs}s`;
};

export const formatTime = (timestamp: number): string =>
  new Date(timestamp).toLocaleTimeString();

export const formatDateTime = (timestamp: number | undefined): string => {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleString();
};

export const formatResponseTime = (value: number | undefined): string => {
  const normalized = Number(value) || 0;
  return `${Math.round(normalized)} ms`;
};

export const getPercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
};

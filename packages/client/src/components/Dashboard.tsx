/**
 * Dashboard Component - Real-time metrics display
 */

import { useState, useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useSocket } from "@/hooks/useSocket";
import StatusCard from "./StatusCard";
import { SERVER_URL } from "@/constants/chat";
import type { DashboardMetrics, ConnectionStatus } from "@/types";
import type { AiParticipant } from "@/config/aiParticipants";

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: string;
  color?: string;
}

interface ProgressBarProps {
  value: number;
  max: number;
  label: string;
  color?: string;
}

const Dashboard = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
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
  });

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
  });
  const [history, setHistory] = useState<unknown[]>([]);
  const [aiParticipants, setAiParticipants] = useState<AiParticipant[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  // Socket connection
  const { on, emit } = useSocket(SERVER_URL);

  // Setup socket listeners
  useEffect(() => {
    // Connection events
    on("connect", () => {
      setConnectionStatus({ connected: true });
      emit("join-dashboard");
      emit("get-metrics");
      emit("get-metrics-history", { duration: 60 * 60 * 1000 }); // Last hour
      emit("get-ai-participants");
    });

    on("disconnect", () => {
      setConnectionStatus({ connected: false });
    });

    // Metrics events
    on("metrics-update", (data: unknown) => {
      setMetrics(data as DashboardMetrics);
    });

    on("metrics-history", (data: unknown) => {
      setHistory(data as unknown[]);
    });

    on("ai-participants", (data: unknown) => {
      setAiParticipants(Array.isArray(data) ? data : []);
    });

    // Join dashboard immediately if connected
    emit("join-dashboard");
    emit("get-ai-participants");
  }, [on, emit]);

  // Auto-refresh metrics every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (connectionStatus.connected) {
        emit("get-metrics");
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [connectionStatus.connected, emit]);

  // Format uptime
  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
  };

  // Format timestamp
  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatDateTime = (timestamp: number | undefined): string => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleString();
  };

  const formatResponseTime = (value: number | undefined): string => {
    const normalized = Number(value) || 0;
    return `${Math.round(normalized)} ms`;
  };

  // Calculate percentage
  const getPercentage = (value: number, total: number): number => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  const MetricCard = ({
    title,
    value,
    subtitle,
    icon,
    color = "blue",
  }: MetricCardProps): ReactNode => (
    <div
      className={`bg-gradient-to-br from-${color}-50 to-${color}-100 border border-${color}-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p
            className={`text-${color}-600 text-sm font-medium uppercase tracking-wide`}
          >
            {title}
          </p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {subtitle && <p className="text-gray-600 text-sm mt-1">{subtitle}</p>}
        </div>
        <div className={`text-${color}-500 text-4xl`}>{icon}</div>
      </div>
    </div>
  );

  const ProgressBar = ({
    value,
    max,
    label,
    color = "blue",
  }: ProgressBarProps): ReactNode => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    return (
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className="text-sm text-gray-500">
            {value} / {max}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`bg-gradient-to-r from-${color}-400 to-${color}-600 h-3 rounded-full transition-all duration-500 ease-out`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          ></div>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {percentage.toFixed(1)}%
        </div>
      </div>
    );
  };

  if (!isVisible) return null;

  const activeAiParticipants = aiParticipants
    .filter((participant) => participant.status === "active")
    .sort((first, second) =>
      (first.name || "").localeCompare(second.name || ""),
    );

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
              AI Chat Dashboard
            </h1>
            <p className="text-gray-600 mt-2">
              Real-time metrics and analytics
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              ← Back to Chat
            </Link>

            <div className="flex items-center gap-2 text-sm bg-white rounded-lg px-4 py-2 shadow-sm">
              <div
                className={`w-3 h-3 rounded-full ${connectionStatus.connected ? "bg-green-500" : "bg-red-500 animate-pulse"}`}
              ></div>
              <span>
                {connectionStatus.connected ? "Connected" : "Disconnected"}
              </span>
            </div>

            <div className="text-sm text-gray-500 bg-white rounded-lg px-4 py-2 shadow-sm">
              Last updated: {formatTime(metrics.timestamp)}
            </div>
          </div>
        </div>

        {/* Main Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <MetricCard
            title="Total Messages"
            value={metrics.totalMessages}
            subtitle="All time"
            icon="💬"
            color="blue"
          />

          <MetricCard
            title="AI Messages"
            value={metrics.totalAIMessages}
            subtitle={`${getPercentage(metrics.totalAIMessages, metrics.totalMessages)}% of total`}
            icon="🤖"
            color="purple"
          />

          <MetricCard
            title="User Messages"
            value={metrics.totalUserMessages}
            subtitle={`${getPercentage(metrics.totalUserMessages, metrics.totalMessages)}% of total`}
            icon="👤"
            color="green"
          />

          <MetricCard
            title="Messages/Minute"
            value={metrics.messagesPerMinute}
            subtitle="Current rate"
            icon="⚡"
            color="orange"
          />

          <MetricCard
            title="Active Users"
            value={metrics.activeUsers}
            subtitle="Currently online"
            icon="👥"
            color="teal"
          />

          <MetricCard
            title="Server Uptime"
            value={formatUptime(metrics.uptime)}
            subtitle="Since last restart"
            icon="⏱️"
            color="indigo"
          />
        </div>

        {/* Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Message Distribution */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              Message Distribution
            </h3>

            <ProgressBar
              value={metrics.totalAIMessages}
              max={metrics.totalMessages}
              label="AI Messages"
              color="purple"
            />

            <ProgressBar
              value={metrics.totalUserMessages}
              max={metrics.totalMessages}
              label="User Messages"
              color="green"
            />

            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="text-sm text-gray-600">
                <div className="flex justify-between mb-2">
                  <span>AI to User Ratio:</span>
                  <span className="font-medium">
                    {metrics.totalUserMessages > 0
                      ? (
                          metrics.totalAIMessages / metrics.totalUserMessages
                        ).toFixed(2)
                      : "0"}{" "}
                    : 1
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Activity Level:</span>
                  <span
                    className={`font-medium ${
                      metrics.messagesPerMinute > 10
                        ? "text-red-600"
                        : metrics.messagesPerMinute > 5
                          ? "text-orange-600"
                          : metrics.messagesPerMinute > 1
                            ? "text-green-600"
                            : "text-gray-600"
                    }`}
                  >
                    {metrics.messagesPerMinute > 10
                      ? "Very High"
                      : metrics.messagesPerMinute > 5
                        ? "High"
                        : metrics.messagesPerMinute > 1
                          ? "Moderate"
                          : "Low"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              System Status
            </h3>

            <div className="space-y-4">
              <StatusCard
                icon="🌐"
                iconBackgroundClass="bg-blue-100"
                iconTextClass="text-blue-600"
                title="WebSocket Server"
                subtitle="Real-time connection"
                statusText="Online"
              />

              <StatusCard
                icon="🤖"
                iconBackgroundClass="bg-purple-100"
                iconTextClass="text-purple-600"
                title="AI Services"
                subtitle="Multiple providers active"
                statusText="Active"
              />

              <StatusCard
                icon="📊"
                iconBackgroundClass="bg-orange-100"
                iconTextClass="text-orange-600"
                title="Metrics Collection"
                subtitle="Real-time tracking"
                statusText="Collecting"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              Provider Performance
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 uppercase text-xs tracking-wide">
                    <th className="py-2 pr-4 font-semibold">Provider</th>
                    <th className="py-2 pr-4 font-semibold">Model</th>
                    <th className="py-2 pr-4 font-semibold">Requests</th>
                    <th className="py-2 pr-4 font-semibold">Errors</th>
                    <th className="py-2 pr-4 font-semibold">Mean Response</th>
                  </tr>
                </thead>
                <tbody>
                  {(metrics.providerModelStats || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-gray-500">
                        No provider activity yet.
                      </td>
                    </tr>
                  ) : (
                    metrics.providerModelStats.map((stat) => (
                      <tr
                        key={`${stat.provider}-${stat.model}`}
                        className="border-b border-gray-100"
                      >
                        <td className="py-2 pr-4 font-medium text-gray-900">
                          {stat.provider}
                        </td>
                        <td className="py-2 pr-4 text-gray-700">
                          {stat.model}
                        </td>
                        <td className="py-2 pr-4 text-gray-700">
                          {stat.requests}
                        </td>
                        <td className="py-2 pr-4 text-gray-700">
                          {stat.errors}
                        </td>
                        <td className="py-2 pr-4 text-gray-700">
                          {formatResponseTime(stat.meanResponseTimeMs)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              Recent AI Errors
            </h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {(metrics.errorLogs || []).length === 0 ? (
                <p className="text-gray-500 text-sm">No recent AI errors.</p>
              ) : (
                metrics.errorLogs.map((entry, index) => (
                  <div
                    key={`${entry.provider}-${entry.model}-${entry.timestamp}-${index}`}
                    className="border border-gray-100 rounded-xl p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-medium text-gray-900">
                        {entry.provider} · {entry.model}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDateTime(entry.timestamp)}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">
                      {entry.message}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              Enabled AI Participants
            </h3>
            <span className="text-sm text-gray-500">
              {activeAiParticipants.length} enabled
            </span>
          </div>

          {activeAiParticipants.length === 0 ? (
            <p className="text-sm text-gray-500">
              No active AI participants are currently enabled.
            </p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeAiParticipants.map((participant) => (
                <li
                  key={participant.id}
                  className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
                >
                  <span className="text-2xl" aria-hidden="true">
                    {participant.emoji || "🤖"}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {participant.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      @{participant.alias}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Provider: {participant.provider || "Unknown"}
                    </p>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-green-600">
                    Active
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm">
          <p>Dashboard updates automatically every 2-5 seconds</p>
          <p className="mt-1">
            Server running for {formatUptime(metrics.uptime)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

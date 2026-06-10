/**
 * Dashboard Component - Real-time metrics display (layout & composition;
 * socket wiring lives in useDashboardMetrics)
 */

import { Link } from "react-router-dom";
import StatusCard from "./StatusCard";
import MetricCard from "./MetricCard";
import ProgressBar from "./ProgressBar";
import ProviderStatsTable from "./ProviderStatsTable";
import ErrorLogsPanel from "./ErrorLogsPanel";
import EnabledParticipantsPanel from "./EnabledParticipantsPanel";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import {
  DASHBOARD_STYLES as styles,
  METRICS_REFRESH_INTERVAL_MS,
  resolveActivityLevel,
} from "@/config/dashboard";
import { formatUptime, formatTime, getPercentage } from "@/utils/formatters";

const Dashboard = () => {
  const { metrics, connectionStatus, aiParticipants } = useDashboardMetrics();
  const activityLevel = resolveActivityLevel(metrics.messagesPerMinute);

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

            <div className={`flex items-center gap-2 text-sm ${styles.headerPill}`}>
              <div
                className={`w-3 h-3 rounded-full ${connectionStatus.connected ? "bg-green-500" : "bg-red-500 animate-pulse"}`}
              ></div>
              <span>
                {connectionStatus.connected ? "Connected" : "Disconnected"}
              </span>
            </div>

            <div className={`text-sm text-gray-500 ${styles.headerPill}`}>
              Last updated: {formatTime(metrics.timestamp)}
            </div>
          </div>
        </div>

        {/* Main Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <MetricCard title="Total Messages" value={metrics.totalMessages} subtitle="All time" icon="💬" color="blue" />
          <MetricCard title="AI Messages" value={metrics.totalAIMessages} subtitle={`${getPercentage(metrics.totalAIMessages, metrics.totalMessages)}% of total`} icon="🤖" color="purple" />
          <MetricCard title="User Messages" value={metrics.totalUserMessages} subtitle={`${getPercentage(metrics.totalUserMessages, metrics.totalMessages)}% of total`} icon="👤" color="green" />
          <MetricCard title="Messages/Minute" value={metrics.messagesPerMinute} subtitle="Current rate" icon="⚡" color="orange" />
          <MetricCard title="Active Users" value={metrics.activeUsers} subtitle="Currently online" icon="👥" color="teal" />
          <MetricCard title="Server Uptime" value={formatUptime(metrics.uptime)} subtitle="Since last restart" icon="⏱️" color="indigo" />
        </div>

        {/* Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Message Distribution</h3>
            <ProgressBar value={metrics.totalAIMessages} max={metrics.totalMessages} label="AI Messages" color="purple" />
            <ProgressBar value={metrics.totalUserMessages} max={metrics.totalMessages} label="User Messages" color="green" />
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="text-sm text-gray-600">
                <div className="flex justify-between mb-2">
                  <span>AI to User Ratio:</span>
                  <span className="font-medium">
                    {metrics.totalUserMessages > 0
                      ? (metrics.totalAIMessages / metrics.totalUserMessages).toFixed(2)
                      : "0"}{" "}
                    : 1
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Activity Level:</span>
                  <span className={`font-medium ${activityLevel.className}`}>
                    {activityLevel.label}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>System Status</h3>
            <div className="space-y-4">
              <StatusCard icon="🌐" iconBackgroundClass="bg-blue-100" iconTextClass="text-blue-600" title="WebSocket Server" subtitle="Real-time connection" statusText="Online" />
              <StatusCard icon="🤖" iconBackgroundClass="bg-purple-100" iconTextClass="text-purple-600" title="AI Services" subtitle="Multiple providers active" statusText="Active" />
              <StatusCard icon="📊" iconBackgroundClass="bg-orange-100" iconTextClass="text-orange-600" title="Metrics Collection" subtitle="Real-time tracking" statusText="Collecting" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Provider Performance</h3>
            <ProviderStatsTable providerModelStats={metrics.providerModelStats || []} />
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Recent AI Errors</h3>
            <ErrorLogsPanel errorLogs={metrics.errorLogs} />
          </div>
        </div>

        <EnabledParticipantsPanel aiParticipants={aiParticipants} />

        <div className="text-center text-gray-500 text-sm">
          <p>Dashboard updates automatically every {METRICS_REFRESH_INTERVAL_MS / 1000} seconds</p>
          <p className="mt-1">
            Server running for {formatUptime(metrics.uptime)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

/**
 * Dashboard Component - Real-time metrics display (layout & composition;
 * socket wiring lives in useDashboardMetrics)
 */

import { Link } from "react-router-dom";
import EnabledParticipantsPanel from "./EnabledParticipantsPanel";
import ErrorLogsPanel from "./ErrorLogsPanel";
import Icon from "./Icon";
import MessageMixBar from "./MessageMixBar";
import MetricCard from "./MetricCard";
import ProviderStatsTable from "./ProviderStatsTable";
import StatusCard from "./StatusCard";
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
  const activeModelCount = aiParticipants.filter(
    (participant) => participant.status === "active",
  ).length;
  const aiToUserRatio =
    metrics.totalUserMessages > 0
      ? (metrics.totalAIMessages / metrics.totalUserMessages).toFixed(2)
      : "0";

  return (
    <div className="min-h-dvh bg-canvas text-fg">
      <header className="flex h-14 items-center gap-4 border-b border-line px-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-baseline gap-3">
          <Link to="/" className="wordmark shrink-0 text-xl">
            Vibe chat
          </Link>
          <h1 className="truncate text-sm text-muted">Dashboard</h1>
        </div>
        <span className="hidden text-xs text-faint sm:inline">
          Updated {formatTime(metrics.timestamp)}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              connectionStatus.connected
                ? "bg-emerald-400"
                : "animate-pulse bg-danger"
            }`}
          />
          {connectionStatus.connected ? "Live" : "Reconnecting"}
        </span>
        <Link
          to="/"
          className="flex h-9 items-center gap-1 rounded-lg px-2.5 text-sm font-medium text-muted transition-colors hover:bg-raised hover:text-fg"
        >
          <Icon name="chevron-right" className="h-3.5 w-3.5 rotate-180" />
          Back to chat
        </Link>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6">
        {/* 1px gaps over a line-coloured backing draw the hairlines at every breakpoint */}
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-3 lg:grid-cols-6">
          <MetricCard
            title="Messages"
            value={metrics.totalMessages}
            subtitle="All time"
          />
          <MetricCard
            title="From AI"
            value={metrics.totalAIMessages}
            subtitle={`${getPercentage(metrics.totalAIMessages, metrics.totalMessages)}% of total`}
          />
          <MetricCard
            title="From people"
            value={metrics.totalUserMessages}
            subtitle={`${getPercentage(metrics.totalUserMessages, metrics.totalMessages)}% of total`}
          />
          <MetricCard
            title="Per minute"
            value={metrics.messagesPerMinute}
            subtitle="Current rate"
          />
          <MetricCard
            title="People online"
            value={metrics.activeUsers}
            subtitle="Right now"
          />
          <MetricCard
            title="Uptime"
            value={formatUptime(metrics.uptime)}
            subtitle="Since last restart"
          />
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-5">
          <section className="lg:col-span-3">
            <h2 className={`mb-3 ${styles.sectionTitle}`}>Message mix</h2>
            <div className={`${styles.panel} p-5`}>
              <MessageMixBar
                aiMessages={metrics.totalAIMessages}
                userMessages={metrics.totalUserMessages}
              />
              <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4 text-sm">
                <div>
                  <dt className="text-muted">AI replies per human message</dt>
                  <dd className="mt-0.5 font-display text-lg font-bold tabular-nums">
                    {aiToUserRatio}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Activity</dt>
                  <dd
                    className={`mt-0.5 font-display text-lg font-bold ${activityLevel.className}`}
                  >
                    {activityLevel.label}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="lg:col-span-2">
            <h2 className={`mb-3 ${styles.sectionTitle}`}>System</h2>
            <div className={`${styles.panel} divide-y divide-line`}>
              <StatusCard
                title="Live connection"
                subtitle="WebSocket to the chat server"
                statusText={
                  connectionStatus.connected ? "Connected" : "Reconnecting"
                }
                tone={connectionStatus.connected ? "ok" : "down"}
              />
              <StatusCard
                title="Models"
                subtitle="Enabled and able to answer"
                statusText={`${activeModelCount} enabled`}
                tone={activeModelCount > 0 ? "ok" : "warn"}
              />
              <StatusCard
                title="Metrics"
                subtitle={`Refreshed every ${METRICS_REFRESH_INTERVAL_MS / 1000} seconds`}
                statusText={formatTime(metrics.timestamp)}
                tone={connectionStatus.connected ? "ok" : "warn"}
              />
            </div>
          </section>
        </div>

        <section>
          <h2 className={`mb-3 ${styles.sectionTitle}`}>
            Provider performance
          </h2>
          <div className={`${styles.panel} px-5 py-2`}>
            <ProviderStatsTable
              providerModelStats={metrics.providerModelStats || []}
            />
          </div>
        </section>

        <section>
          <h2 className={`mb-3 ${styles.sectionTitle}`}>Recent AI errors</h2>
          <ErrorLogsPanel errorLogs={metrics.errorLogs} />
        </section>

        <EnabledParticipantsPanel aiParticipants={aiParticipants} />
      </main>
    </div>
  );
};

export default Dashboard;

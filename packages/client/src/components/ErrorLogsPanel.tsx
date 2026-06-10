/**
 * ErrorLogsPanel Component - Recent AI error entries with timestamps
 */

import { formatDateTime } from "@/utils/formatters";
import type { DashboardMetrics } from "@/types";

interface ErrorLogsPanelProps {
  errorLogs: DashboardMetrics["errorLogs"];
}

const ErrorLogsPanel = ({ errorLogs }: ErrorLogsPanelProps) => (
  <div className="space-y-4 max-h-96 overflow-y-auto">
    {(errorLogs || []).length === 0 ? (
      <p className="text-gray-500 text-sm">No recent AI errors.</p>
    ) : (
      errorLogs.map((entry, index) => (
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
);

export default ErrorLogsPanel;

/**
 * ErrorLogsPanel Component - Recent AI error entries with timestamps
 */

import { formatDateTime } from "@/utils/formatters";
import { voiceStyleFor } from "@/utils/voice";
import { DASHBOARD_STYLES } from "@/config/dashboard";
import type { DashboardMetrics } from "@/types";

interface ErrorLogsPanelProps {
  errorLogs: DashboardMetrics["errorLogs"];
}

const ErrorLogsPanel = ({ errorLogs }: ErrorLogsPanelProps) =>
  (errorLogs || []).length === 0 ? (
    <p className={`${DASHBOARD_STYLES.panel} px-5 py-4 text-sm text-muted`}>
      No recent AI errors.
    </p>
  ) : (
    <ol
      className={`${DASHBOARD_STYLES.panel} thin-scrollbar max-h-96 divide-y divide-line overflow-y-auto`}
    >
      {errorLogs.map((entry, index) => (
        <li
          key={`${entry.provider}-${entry.model}-${entry.timestamp}-${index}`}
          className="px-5 py-3.5"
          style={voiceStyleFor(entry.provider)}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="text-sm">
              <span className="font-semibold text-voice">{entry.provider}</span>{" "}
              <span className="text-fg">{entry.model}</span>
            </p>
            <time className="text-xs tabular-nums text-faint">
              {formatDateTime(entry.timestamp)}
            </time>
          </div>
          <p className="mt-1.5 whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-muted">
            {entry.message}
          </p>
        </li>
      ))}
    </ol>
  );

export default ErrorLogsPanel;

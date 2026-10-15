/**
 * StatusCard Component - one system-status row: what, detail, and state
 */

import { STATUS_DOT_CLASSES, type StatusTone } from "@/config/dashboard";

interface StatusCardProps {
  title: string;
  subtitle: string;
  statusText: string;
  tone: StatusTone;
}

const StatusCard = ({ title, subtitle, statusText, tone }: StatusCardProps) => (
  <div className="flex items-center justify-between gap-4 px-5 py-3.5">
    <div className="min-w-0">
      <p className="text-sm font-medium text-fg">{title}</p>
      <p className="truncate text-xs text-faint">{subtitle}</p>
    </div>
    <span className="flex shrink-0 items-center gap-2 text-sm text-muted">
      <span className={`h-2 w-2 rounded-full ${STATUS_DOT_CLASSES[tone]}`} />
      {statusText}
    </span>
  </div>
);

export default StatusCard;

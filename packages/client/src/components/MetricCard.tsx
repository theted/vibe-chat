/**
 * MetricCard Component - one cell of the dashboard stat strip
 */

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
}

const MetricCard = ({ title, value, subtitle }: MetricCardProps) => (
  <div className="bg-surface px-5 py-4">
    <p className="text-sm text-muted">{title}</p>
    <p className="mt-1 whitespace-nowrap font-display text-2xl font-bold tabular-nums text-fg">
      {typeof value === "number" ? value.toLocaleString() : value}
    </p>
    {subtitle && <p className="mt-0.5 text-xs text-faint">{subtitle}</p>}
  </div>
);

export default MetricCard;

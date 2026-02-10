/**
 * MetricCard Component - Displays a single metric with icon and gradient styling
 */

import type { ReactNode } from "react";

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: string;
  color?: string;
}

const METRIC_CARD_STYLES: Record<
  string,
  { container: string; title: string; icon: string }
> = {
  blue: {
    container:
      "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200",
    title: "text-blue-600",
    icon: "text-blue-500",
  },
  purple: {
    container:
      "bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200",
    title: "text-purple-600",
    icon: "text-purple-500",
  },
  green: {
    container:
      "bg-gradient-to-br from-green-50 to-green-100 border-green-200",
    title: "text-green-600",
    icon: "text-green-500",
  },
  orange: {
    container:
      "bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200",
    title: "text-orange-600",
    icon: "text-orange-500",
  },
  teal: {
    container:
      "bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200",
    title: "text-teal-600",
    icon: "text-teal-500",
  },
  indigo: {
    container:
      "bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200",
    title: "text-indigo-600",
    icon: "text-indigo-500",
  },
};

const MetricCard = ({
  title,
  value,
  subtitle,
  icon,
  color = "blue",
}: MetricCardProps): ReactNode => {
  const styles = METRIC_CARD_STYLES[color] || METRIC_CARD_STYLES.blue;
  return (
    <div
      className={`${styles.container} border rounded-2xl p-6 shadow-md hover:shadow-lg transition-all duration-300`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p
            className={`${styles.title} text-sm font-medium uppercase tracking-wide`}
          >
            {title}
          </p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {subtitle && <p className="text-gray-600 text-sm mt-1">{subtitle}</p>}
        </div>
        <div className={`${styles.icon} text-4xl`}>{icon}</div>
      </div>
    </div>
  );
};

export default MetricCard;

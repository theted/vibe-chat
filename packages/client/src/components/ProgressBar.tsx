/**
 * ProgressBar Component - Displays a labeled progress bar with gradient styling
 */

import type { ReactNode } from "react";

interface ProgressBarProps {
  value: number;
  max: number;
  label: string;
  color?: string;
}

const PROGRESS_BAR_STYLES: Record<string, string> = {
  blue: "bg-gradient-to-r from-blue-400 to-blue-600",
  purple: "bg-gradient-to-r from-purple-400 to-purple-600",
  green: "bg-gradient-to-r from-green-400 to-green-600",
  orange: "bg-gradient-to-r from-orange-400 to-orange-600",
  teal: "bg-gradient-to-r from-teal-400 to-teal-600",
  indigo: "bg-gradient-to-r from-indigo-400 to-indigo-600",
};

const ProgressBar = ({
  value,
  max,
  label,
  color = "blue",
}: ProgressBarProps): ReactNode => {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  const barStyle = PROGRESS_BAR_STYLES[color] || PROGRESS_BAR_STYLES.blue;
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
          className={`${barStyle} h-3 rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
      <div className="text-xs text-gray-500 mt-1">
        {percentage.toFixed(1)}%
      </div>
    </div>
  );
};

export default ProgressBar;

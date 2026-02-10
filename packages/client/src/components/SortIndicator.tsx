/**
 * SortIndicator Component - Shows sort direction arrow for table columns
 */

type SortColumn = "provider" | "model" | "requests" | "errors" | "meanResponseTimeMs";
type SortDirection = "asc" | "desc";

interface SortIndicatorProps {
  column: SortColumn;
  activeColumn: SortColumn;
  direction: SortDirection;
}

const SortIndicator = ({ column, activeColumn, direction }: SortIndicatorProps) => {
  if (activeColumn !== column) {
    return <span className="text-gray-300 ml-1">↕</span>;
  }
  return (
    <span className="text-primary-600 ml-1">
      {direction === "asc" ? "↑" : "↓"}
    </span>
  );
};

export type { SortColumn, SortDirection };
export default SortIndicator;

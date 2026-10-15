/**
 * SortIndicator Component - Shows sort direction arrow for table columns
 */

type SortColumn =
  | "provider"
  | "model"
  | "requests"
  | "errors"
  | "meanResponseTimeMs";
type SortDirection = "asc" | "desc";

interface SortIndicatorProps {
  column: SortColumn;
  activeColumn: SortColumn;
  direction: SortDirection;
}

const SortIndicator = ({
  column,
  activeColumn,
  direction,
}: SortIndicatorProps) => {
  if (activeColumn !== column) {
    return <span className="ml-1 text-faint opacity-50">↕</span>;
  }
  return (
    <span className="ml-1 text-accent">{direction === "asc" ? "↑" : "↓"}</span>
  );
};

export type { SortColumn, SortDirection };
export default SortIndicator;

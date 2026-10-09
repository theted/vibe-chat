/**
 * ProviderStatsTable Component - Sortable per-provider/model request stats
 */

import { useState } from "react";
import SortIndicator from "./SortIndicator";
import type { SortColumn, SortDirection } from "./SortIndicator";
import { formatResponseTime } from "@/utils/formatters";
import { voiceStyleFor } from "@/utils/voice";
import type { ProviderModelStat } from "@/types";

interface ProviderStatsTableProps {
  providerModelStats: ProviderModelStat[];
}

const COLUMN_LABELS: Record<SortColumn, string> = {
  provider: "Provider",
  model: "Model",
  requests: "Requests",
  errors: "Errors",
  meanResponseTimeMs: "Mean response",
};

// Numbers right-align so their digits line up down the column
const NUMERIC_COLUMNS = new Set<SortColumn>([
  "requests",
  "errors",
  "meanResponseTimeMs",
]);

const SORTABLE_COLUMNS = [
  "provider",
  "model",
  "requests",
  "errors",
  "meanResponseTimeMs",
] as const;

const ProviderStatsTable = ({
  providerModelStats,
}: ProviderStatsTableProps) => {
  const [sortColumn, setSortColumn] = useState<SortColumn>("provider");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedProviderStats = [...providerModelStats].sort(
    (a: ProviderModelStat, b: ProviderModelStat) => {
      const multiplier = sortDirection === "asc" ? 1 : -1;
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (typeof aVal === "string" && typeof bVal === "string") {
        return multiplier * aVal.localeCompare(bVal);
      }
      return multiplier * ((aVal as number) - (bVal as number));
    },
  );

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs text-muted">
            {SORTABLE_COLUMNS.map((col) => (
              <th
                key={col}
                className={`py-2.5 pr-4 font-medium last:pr-0 ${NUMERIC_COLUMNS.has(col) ? "text-right" : ""}`}
                aria-sort={
                  sortColumn === col
                    ? sortDirection === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
              >
                <button
                  type="button"
                  onClick={() => handleSort(col)}
                  className="select-none transition-colors hover:text-fg"
                >
                  {COLUMN_LABELS[col]}
                  <SortIndicator
                    column={col}
                    activeColumn={sortColumn}
                    direction={sortDirection}
                  />
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {sortedProviderStats.length === 0 ? (
            <tr>
              <td colSpan={SORTABLE_COLUMNS.length} className="py-4 text-muted">
                No provider activity yet.
              </td>
            </tr>
          ) : (
            sortedProviderStats.map((stat) => (
              <tr
                key={`${stat.provider}-${stat.model}`}
                style={voiceStyleFor(stat.provider)}
              >
                <td className="py-2.5 pr-4">
                  <span className="flex items-center gap-2 font-medium text-fg">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-voice" />
                    {stat.provider}
                  </span>
                </td>
                <td className="py-2.5 pr-4 text-muted">{stat.model}</td>
                <td className="py-2.5 pr-4 text-right tabular-nums text-fg">
                  {stat.requests}
                </td>
                <td
                  className={`py-2.5 pr-4 text-right tabular-nums ${stat.errors > 0 ? "text-danger" : "text-faint"}`}
                >
                  {stat.errors}
                </td>
                <td className="py-2.5 text-right tabular-nums text-fg">
                  {formatResponseTime(stat.meanResponseTimeMs)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ProviderStatsTable;

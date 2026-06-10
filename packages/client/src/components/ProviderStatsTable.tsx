/**
 * ProviderStatsTable Component - Sortable per-provider/model request stats
 */

import { useState } from "react";
import SortIndicator from "./SortIndicator";
import type { SortColumn, SortDirection } from "./SortIndicator";
import { formatResponseTime } from "@/utils/formatters";
import type { ProviderModelStat } from "@/types";

interface ProviderStatsTableProps {
  providerModelStats: ProviderModelStat[];
}

const SORTABLE_COLUMNS = [
  "provider",
  "model",
  "requests",
  "errors",
  "meanResponseTimeMs",
] as const;

const ProviderStatsTable = ({ providerModelStats }: ProviderStatsTableProps) => {
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
          <tr className="border-b border-gray-200 text-gray-500 uppercase text-xs tracking-wide">
            {SORTABLE_COLUMNS.map((col) => (
              <th
                key={col}
                className="py-2 pr-4 font-semibold cursor-pointer hover:text-gray-700 select-none"
                onClick={() => handleSort(col)}
              >
                {col === "meanResponseTimeMs" ? "Mean Response" : col.charAt(0).toUpperCase() + col.slice(1)}
                <SortIndicator column={col} activeColumn={sortColumn} direction={sortDirection} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedProviderStats.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-4 text-gray-500">
                No provider activity yet.
              </td>
            </tr>
          ) : (
            sortedProviderStats.map((stat) => (
              <tr key={`${stat.provider}-${stat.model}`} className="border-b border-gray-100">
                <td className="py-2 pr-4 font-medium text-gray-900">{stat.provider}</td>
                <td className="py-2 pr-4 text-gray-700">{stat.model}</td>
                <td className="py-2 pr-4 text-gray-700">{stat.requests}</td>
                <td className="py-2 pr-4 text-gray-700">{stat.errors}</td>
                <td className="py-2 pr-4 text-gray-700">{formatResponseTime(stat.meanResponseTimeMs)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ProviderStatsTable;

import { useState, useMemo } from "react";

export type SortDirection = "asc" | "desc" | null;

interface UseSortableTableProps<T> {
  data: T[];
  initialSortKey?: keyof T;
  initialDirection?: SortDirection;
}

export function useTableSort<T>({
  data,
  initialSortKey,
  initialDirection = "asc",
}: UseSortableTableProps<T>) {
  const [sortKey, setSortKey] = useState<keyof T | null>(initialSortKey || null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialDirection);

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      // Handle null/undefined values
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // Compare values
      if (typeof aVal === "string" && typeof bVal === "string") {
        const comparison = aVal.localeCompare(bVal, "pt-PT");
        return sortDirection === "asc" ? comparison : -comparison;
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }

      // Default string comparison
      return sortDirection === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [data, sortKey, sortDirection]);

  const handleSort = (key: keyof T) => {
    if (sortKey === key) {
      // Toggle direction or reset
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortKey(null);
        setSortDirection(null);
      }
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  return {
    sortedData,
    sortKey,
    sortDirection,
    handleSort,
  };
}

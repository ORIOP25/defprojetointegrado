import React from "react"; // Importar React
import { TableHead } from "@/components/ui/table";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { SortDirection } from "@/hooks/useTableSort";

interface SortableTableHeadProps<T> {
  column: keyof T;
  label: string;
  sortKey: keyof T | null;
  sortDirection: SortDirection;
  onSort: (key: keyof T) => void;
  className?: string;
}

// 1. Definir a função do componente (podes dar um nome diferente se quiseres, ex: _SortableTableHead)
function SortableTableHeadComponent<T>({
  column,
  label,
  sortKey,
  sortDirection,
  onSort,
  className,
}: SortableTableHeadProps<T>) {
  const isActive = sortKey === column;

  return (
    <TableHead className={cn("cursor-pointer select-none", className)} onClick={() => onSort(column)}>
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {isActive && sortDirection === "asc" && <ArrowUp className="h-4 w-4" />}
        {isActive && sortDirection === "desc" && <ArrowDown className="h-4 w-4" />}
        {!isActive && <ArrowUpDown className="h-4 w-4 text-muted-foreground/50" />}
      </div>
    </TableHead>
  );
}

// 2. Envolver a função definida com React.memo e exportar
export const SortableTableHead = React.memo(SortableTableHeadComponent) as <T>(props: SortableTableHeadProps<T>) => JSX.Element;

// 3. (Opcional mas recomendado) Manter o displayName
(SortableTableHead as any).displayName = "SortableTableHead";
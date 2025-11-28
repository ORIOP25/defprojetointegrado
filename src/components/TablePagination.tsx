import React from "react"; // Importar React
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onGoToPage: (page: number) => void;
}

// Envolver a definição do componente com React.memo
export const TablePagination = React.memo(function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPreviousPage,
  onNextPage,
  onGoToPage,
}: TablePaginationProps) {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push("...");
      }

      // Show pages around current
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("...");
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="flex items-center justify-between px-2 py-4">
      <div className="text-sm text-muted-foreground">
        A mostrar {startItem} a {endItem} de {totalItems} resultados
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPreviousPage}
          disabled={currentPage === 1}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>

        <div className="flex gap-1">
          {getPageNumbers().map((page, index) =>
            typeof page === "number" ? (
              <Button
                key={index}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => onGoToPage(page)}
                className="min-w-[40px]"
              >
                {page}
              </Button>
            ) : (
              <span key={index} className="px-2 py-2 text-muted-foreground">
                {page}
              </span>
            )
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onNextPage}
          disabled={currentPage === totalPages}
          className="gap-1"
        >
          Seguinte
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

// Opcional: Definir displayName
TablePagination.displayName = "TablePagination";
import { useState, useMemo } from "react";

interface UsePaginationProps<T> {
  data: T[];
  itemsPerPage?: number;
}

export function usePagination<T>({ data, itemsPerPage = 10 }: UsePaginationProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(data.length / itemsPerPage);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, itemsPerPage]);

  const goToPage = (page: number) => {
    const pageNumber = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(pageNumber);
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const previousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Reset to page 1 when data changes
  useMemo(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [data.length, totalPages]);

  return {
    paginatedData,
    currentPage,
    totalPages,
    goToPage,
    nextPage,
    previousPage,
    itemsPerPage,
    totalItems: data.length,
  };
}

import { useState, useEffect } from 'react';

const PAGE_SIZE = 10;

export function usePagination<T>(items: T[], resetDeps: any[] = []) {
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, resetDeps);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const paginated = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return { page, setPage, totalPages, paginated, PAGE_SIZE };
}

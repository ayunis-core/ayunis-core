export function paginateItems<T>(
  items: readonly T[],
  requestedPage: number,
  pageSize: number,
): { pageItems: T[]; currentPage: number; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  // Clamp so deleting the last item on the final page doesn't leave an empty page.
  const currentPage = Math.min(Math.max(1, requestedPage), totalPages);
  const start = (currentPage - 1) * pageSize;
  return {
    pageItems: items.slice(start, start + pageSize),
    currentPage,
    totalPages,
  };
}

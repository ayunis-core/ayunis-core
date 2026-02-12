/**
 * Compute a compact list of page numbers (1-based) with ellipsis markers
 * for pagination controls.
 */
export function getPageNumbers(
  totalPages: number,
  currentPage: number,
): (number | 'ellipsis')[] {
  const total = Math.max(totalPages, 1);
  const current = currentPage + 1; // convert to 1-based
  const delta = 1;

  const pages: (number | 'ellipsis')[] = [];
  const range: number[] = [];

  for (
    let i = Math.max(2, current - delta);
    i <= Math.min(total - 1, current + delta);
    i++
  ) {
    range.push(i);
  }

  pages.push(1);
  if (range[0] > 2) pages.push('ellipsis');
  pages.push(...range);
  if (range[range.length - 1] < total - 1) pages.push('ellipsis');
  if (total > 1) pages.push(total);

  return pages;
}

export const CONTEXT_PAGE_SIZE = 20;

export function pageTotal(pagination: { total?: number } | undefined): number {
  return pagination?.total ?? 0;
}

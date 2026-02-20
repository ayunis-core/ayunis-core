import PaginationWidget from './PaginationWidget';

interface SearchPaginationProps {
  currentPage: number;
  totalPages: number;
  to: string;
  search?: string;
  extraSearchParams?: Record<string, string | undefined>;
}

/**
 * A convenience wrapper around PaginationWidget for the common case
 * of paginating with a `search` query and a `page` number.
 * Accepts optional extra search params (e.g. agentId).
 */
export default function SearchPagination({
  currentPage,
  totalPages,
  to,
  search,
  extraSearchParams,
}: Readonly<SearchPaginationProps>) {
  const buildSearchParams = (targetPage: number) => {
    const params: Record<string, string | number> = {};
    if (search) {
      params.search = search;
    }
    if (extraSearchParams) {
      for (const [key, value] of Object.entries(extraSearchParams)) {
        if (value !== undefined) {
          params[key] = value;
        }
      }
    }
    params.page = targetPage;
    return params;
  };

  return (
    <PaginationWidget
      currentPage={currentPage}
      totalPages={totalPages}
      to={to}
      buildSearchParams={buildSearchParams}
    />
  );
}

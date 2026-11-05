import type { OrgLifecycleFilter, OrgsSortField } from '@/shared/api';
import type { TableSort } from '@/shared/lib/table-sort';
import { SearchPagination } from '@/widgets/pagination';

interface OrgsPaginationProps {
  currentPage: number;
  totalPages: number;
  search?: string;
  lifecycle: OrgLifecycleFilter;
  sort: TableSort<OrgsSortField>;
}

export default function OrgsPagination({
  currentPage,
  totalPages,
  search,
  lifecycle,
  sort,
}: Readonly<OrgsPaginationProps>) {
  return (
    <SearchPagination
      currentPage={currentPage}
      totalPages={totalPages}
      to="/super-admin-settings/orgs"
      search={search}
      extraSearchParams={{ orgLifecycle: lifecycle, ...sort }}
    />
  );
}

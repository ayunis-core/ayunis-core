import { SearchPagination } from '@/widgets/pagination';
import type { SuperAdminUsersSortField } from '@/shared/api';
import type { TableSort } from '@/shared/lib/table-sort';

interface UsersPaginationProps {
  currentPage: number;
  totalPages: number;
  search?: string;
  sort: TableSort<SuperAdminUsersSortField>;
}

export function UsersPagination({
  currentPage,
  totalPages,
  search,
  sort,
}: Readonly<UsersPaginationProps>) {
  return (
    <SearchPagination
      currentPage={currentPage}
      totalPages={totalPages}
      to="/super-admin-settings/users"
      search={search}
      extraSearchParams={{ ...sort }}
    />
  );
}

import { SearchPagination } from '@/widgets/pagination';
import type { OrgUsersSortField } from '@ayunis/api-client';
import type { TableSort } from '@/shared/lib/table-sort';

interface UsersPaginationProps {
  currentPage: number;
  totalPages: number;
  search?: string;
  sort: TableSort<OrgUsersSortField>;
}

export default function UsersPagination({
  currentPage,
  totalPages,
  search,
  sort,
}: Readonly<UsersPaginationProps>) {
  return (
    <SearchPagination
      currentPage={currentPage}
      totalPages={totalPages}
      to="/admin-settings/users"
      search={search}
      extraSearchParams={{ ...sort }}
    />
  );
}

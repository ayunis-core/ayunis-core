import { SearchPagination } from '@/widgets/pagination';

interface UsersPaginationProps {
  currentPage: number;
  totalPages: number;
  search?: string;
}

export function UsersPagination({
  currentPage,
  totalPages,
  search,
}: Readonly<UsersPaginationProps>) {
  return (
    <SearchPagination
      currentPage={currentPage}
      totalPages={totalPages}
      to="/super-admin-settings/users"
      search={search}
    />
  );
}

import { SearchPagination } from '@/widgets/pagination';

interface UsersPaginationProps {
  currentPage: number;
  totalPages: number;
  search?: string;
}

export default function UsersPagination({
  currentPage,
  totalPages,
  search,
}: Readonly<UsersPaginationProps>) {
  return (
    <SearchPagination
      currentPage={currentPage}
      totalPages={totalPages}
      to="/admin-settings/users"
      search={search}
    />
  );
}

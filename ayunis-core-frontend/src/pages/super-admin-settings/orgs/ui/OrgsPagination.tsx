import { SearchPagination } from '@/widgets/pagination';

interface OrgsPaginationProps {
  currentPage: number;
  totalPages: number;
  search?: string;
}

export default function OrgsPagination({
  currentPage,
  totalPages,
  search,
}: Readonly<OrgsPaginationProps>) {
  return (
    <SearchPagination
      currentPage={currentPage}
      totalPages={totalPages}
      to="/super-admin-settings/orgs"
      search={search}
    />
  );
}

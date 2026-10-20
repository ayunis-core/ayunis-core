import type { OrgLifecycleFilter } from '@/shared/api';
import { SearchPagination } from '@/widgets/pagination';

interface OrgsPaginationProps {
  currentPage: number;
  totalPages: number;
  search?: string;
  lifecycle: OrgLifecycleFilter;
}

export default function OrgsPagination({
  currentPage,
  totalPages,
  search,
  lifecycle,
}: Readonly<OrgsPaginationProps>) {
  return (
    <SearchPagination
      currentPage={currentPage}
      totalPages={totalPages}
      to="/super-admin-settings/orgs"
      search={search}
      extraSearchParams={{ orgLifecycle: lifecycle }}
    />
  );
}

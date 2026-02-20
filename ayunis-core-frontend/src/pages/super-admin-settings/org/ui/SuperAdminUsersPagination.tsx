import { PaginationWidget } from '@/widgets/pagination';

interface SuperAdminUsersPaginationProps {
  currentPage: number;
  totalPages: number;
  search?: string;
  orgId: string;
}

export default function SuperAdminUsersPagination({
  currentPage,
  totalPages,
  search,
  orgId,
}: Readonly<SuperAdminUsersPaginationProps>) {
  const buildSearchParams = (targetPage: number) => ({
    tab: 'users' as const,
    ...(search && { usersSearch: search }),
    usersPage: targetPage,
  });

  return (
    <PaginationWidget
      currentPage={currentPage}
      totalPages={totalPages}
      to="/super-admin-settings/orgs/$id"
      params={{ id: orgId }}
      buildSearchParams={buildSearchParams}
    />
  );
}

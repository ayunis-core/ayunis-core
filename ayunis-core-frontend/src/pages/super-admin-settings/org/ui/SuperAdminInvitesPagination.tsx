import { PaginationWidget } from '@/widgets/pagination';

interface SuperAdminInvitesPaginationProps {
  currentPage: number;
  totalPages: number;
  search?: string;
  orgId: string;
}

export default function SuperAdminInvitesPagination({
  currentPage,
  totalPages,
  search,
  orgId,
}: Readonly<SuperAdminInvitesPaginationProps>) {
  const buildSearchParams =
    (targetPage: number) =>
    (previous: Record<string, string | number | boolean | undefined>) => ({
      ...previous,
      tab: 'users' as const,
      invitesSearch: search ?? undefined,
      invitesPage: targetPage,
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

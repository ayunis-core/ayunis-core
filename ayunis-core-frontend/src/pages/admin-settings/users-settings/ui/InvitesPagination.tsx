import { PaginationWidget } from '@/widgets/pagination';

interface InvitesPaginationProps {
  currentPage: number;
  totalPages: number;
  search?: string;
}

export default function InvitesPagination({
  currentPage,
  totalPages,
  search,
}: Readonly<InvitesPaginationProps>) {
  const buildSearchParams =
    (targetPage: number) =>
    (prev: Record<string, string | number | boolean | undefined>) => ({
      ...prev,
      invitesSearch: search ?? undefined,
      invitesPage: targetPage,
    });

  return (
    <PaginationWidget
      currentPage={currentPage}
      totalPages={totalPages}
      to="/admin-settings/users"
      buildSearchParams={buildSearchParams}
    />
  );
}

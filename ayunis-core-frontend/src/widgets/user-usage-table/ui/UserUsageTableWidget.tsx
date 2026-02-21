import type { UserUsageDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { UserUsageTableContent } from './UserUsageTableContent';
import { UserUsageTableLoading } from './UserUsageTableLoading';
import { UserUsageTableError } from './UserUsageTableError';
import { UserUsageTableEmpty } from './UserUsageTableEmpty';

export const DEFAULT_PAGE_SIZE = 10;

interface UserUsageTableWidgetProps {
  users: UserUsageDto[];
  total: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
  error: unknown;
}

export function UserUsageTableWidget({
  users,
  total,
  currentPage,
  onPageChange,
  isLoading,
  error,
}: Readonly<UserUsageTableWidgetProps>) {
  const totalPages = Math.ceil(total / DEFAULT_PAGE_SIZE);

  if (isLoading) return <UserUsageTableLoading />;
  if (error) return <UserUsageTableError error={error} />;
  if (total === 0) return <UserUsageTableEmpty />;

  return (
    <UserUsageTableContent
      users={users}
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={onPageChange}
    />
  );
}

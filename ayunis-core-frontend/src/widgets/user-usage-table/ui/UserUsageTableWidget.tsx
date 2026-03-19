import type { ReactNode } from 'react';
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
  headerAction?: ReactNode;
  description?: ReactNode;
}

export function UserUsageTableWidget({
  users,
  total,
  currentPage,
  onPageChange,
  isLoading,
  error,
  headerAction,
  description,
}: Readonly<UserUsageTableWidgetProps>) {
  const totalPages = Math.ceil(total / DEFAULT_PAGE_SIZE);

  if (isLoading)
    return (
      <UserUsageTableLoading
        headerAction={headerAction}
        description={description}
      />
    );
  if (error)
    return (
      <UserUsageTableError
        error={error}
        headerAction={headerAction}
        description={description}
      />
    );
  if (total === 0)
    return (
      <UserUsageTableEmpty
        headerAction={headerAction}
        description={description}
      />
    );

  return (
    <UserUsageTableContent
      users={users}
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={onPageChange}
      headerAction={headerAction}
      description={description}
    />
  );
}

// Utils
import { useState, useMemo } from 'react';

// Features
import { useUserUsage } from '@/pages/admin-settings/usage-settings/api';

// UI
import { UserUsageTableLoading } from './UserUsageTableLoading';
import { UserUsageTableError } from './UserUsageTableError';
import { UserUsageTableEmpty } from './UserUsageTableEmpty';
import { UserUsageTableContent } from './UserUsageTableContent';

interface UserUsageTableProps {
  startDate?: Date;
  endDate?: Date;
}

const DEFAULT_PAGE_SIZE = 10;

export function UserUsageTable({ startDate, endDate }: UserUsageTableProps) {
  // Create a filter key that changes when filters change
  const filterKey = useMemo(
    () => `${startDate?.toISOString() ?? ''}-${endDate?.toISOString() ?? ''}`,
    [startDate, endDate],
  );

  return (
    <UserUsageTableInner
      key={filterKey}
      startDate={startDate}
      endDate={endDate}
    />
  );
}

function UserUsageTableInner({ startDate, endDate }: UserUsageTableProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = DEFAULT_PAGE_SIZE;
  const offset = currentPage * pageSize;

  const {
    data: userUsageResponse,
    isLoading,
    error,
  } = useUserUsage({
    startDate: startDate?.toISOString(),
    endDate: endDate?.toISOString(),
    limit: pageSize,
    offset: offset,
  });

  const users = userUsageResponse?.data ?? [];
  const total = userUsageResponse?.pagination?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  if (isLoading) {
    return <UserUsageTableLoading />;
  }

  if (error) {
    return <UserUsageTableError error={error} />;
  }

  if (total === 0) {
    return <UserUsageTableEmpty />;
  }

  return (
    <UserUsageTableContent
      users={users}
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={setCurrentPage}
    />
  );
}

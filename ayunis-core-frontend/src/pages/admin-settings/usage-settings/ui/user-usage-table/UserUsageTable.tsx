import { useState, useMemo } from 'react';
import { useUserUsage } from '@/pages/admin-settings/usage-settings/api';
import {
  UserUsageTableWidget,
  DEFAULT_PAGE_SIZE,
} from '@/widgets/user-usage-table';

interface UserUsageTableProps {
  startDate?: Date;
  endDate?: Date;
}

export function UserUsageTable({
  startDate,
  endDate,
}: Readonly<UserUsageTableProps>) {
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

function UserUsageTableInner({
  startDate,
  endDate,
}: Readonly<UserUsageTableProps>) {
  const [currentPage, setCurrentPage] = useState(0);
  const offset = currentPage * DEFAULT_PAGE_SIZE;

  const {
    data: userUsageResponse,
    isLoading,
    error,
  } = useUserUsage({
    startDate: startDate?.toISOString(),
    endDate: endDate?.toISOString(),
    limit: DEFAULT_PAGE_SIZE,
    offset,
  });

  return (
    <UserUsageTableWidget
      users={userUsageResponse?.data ?? []}
      total={userUsageResponse?.pagination.total ?? 0}
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      isLoading={isLoading}
      error={error}
    />
  );
}

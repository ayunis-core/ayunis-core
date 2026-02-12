import { useState, useMemo } from 'react';
import { useSuperAdminUserUsage } from '../api/useSuperAdminUserUsage';
import {
  UserUsageTableWidget,
  DEFAULT_PAGE_SIZE,
} from '@/widgets/user-usage-table';

interface SuperAdminUserUsageTableProps {
  orgId: string;
  startDate?: Date;
  endDate?: Date;
}

export function SuperAdminUserUsageTable({
  orgId,
  startDate,
  endDate,
}: SuperAdminUserUsageTableProps) {
  const filterKey = useMemo(
    () => `${startDate?.toISOString() ?? ''}-${endDate?.toISOString() ?? ''}`,
    [startDate, endDate],
  );

  return (
    <SuperAdminUserUsageTableInner
      key={filterKey}
      orgId={orgId}
      startDate={startDate}
      endDate={endDate}
    />
  );
}

function SuperAdminUserUsageTableInner({
  orgId,
  startDate,
  endDate,
}: SuperAdminUserUsageTableProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const offset = currentPage * DEFAULT_PAGE_SIZE;

  const {
    data: userUsageResponse,
    isLoading,
    error,
  } = useSuperAdminUserUsage(orgId, {
    startDate: startDate?.toISOString(),
    endDate: endDate?.toISOString(),
    limit: DEFAULT_PAGE_SIZE,
    offset,
  });

  return (
    <UserUsageTableWidget
      users={userUsageResponse?.data ?? []}
      total={userUsageResponse?.pagination?.total ?? 0}
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      isLoading={isLoading}
      error={error}
    />
  );
}

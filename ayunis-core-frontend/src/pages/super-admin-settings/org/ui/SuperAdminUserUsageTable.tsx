import { useState, useMemo } from 'react';
import { useSuperAdminUserUsage } from '../api/useSuperAdminUserUsage';
import { UserUsageTableLoading } from '@/pages/admin-settings/usage-settings/ui/user-usage-table/UserUsageTableLoading';
import { UserUsageTableError } from '@/pages/admin-settings/usage-settings/ui/user-usage-table/UserUsageTableError';
import { UserUsageTableEmpty } from '@/pages/admin-settings/usage-settings/ui/user-usage-table/UserUsageTableEmpty';
import { UserUsageTableContent } from '@/pages/admin-settings/usage-settings/ui/user-usage-table/UserUsageTableContent';

interface SuperAdminUserUsageTableProps {
  orgId: string;
  startDate?: Date;
  endDate?: Date;
}

const DEFAULT_PAGE_SIZE = 10;

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
  const pageSize = DEFAULT_PAGE_SIZE;
  const offset = currentPage * pageSize;

  const {
    data: userUsageResponse,
    isLoading,
    error,
  } = useSuperAdminUserUsage(orgId, {
    startDate: startDate?.toISOString(),
    endDate: endDate?.toISOString(),
    limit: pageSize,
    offset,
  });

  const users = userUsageResponse?.data ?? [];
  const total = userUsageResponse?.pagination?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  if (isLoading) return <UserUsageTableLoading />;
  if (error) return <UserUsageTableError error={error} />;
  if (total === 0) return <UserUsageTableEmpty />;

  return (
    <UserUsageTableContent
      users={users}
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={setCurrentPage}
    />
  );
}

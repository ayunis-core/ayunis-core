import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  UserUsageTableWidget,
  DEFAULT_PAGE_SIZE,
} from '@/widgets/user-usage-table';
import type { UsageOverviewHooks } from '../model/types';

interface UserUsageSectionProps {
  useUserUsage: UsageOverviewHooks['useUserUsage'];
  startDate: string;
  endDate: string;
}

export function UserUsageSection({
  useUserUsage,
  startDate,
  endDate,
}: Readonly<UserUsageSectionProps>) {
  const [currentPage, setCurrentPage] = useState(0);
  const offset = currentPage * DEFAULT_PAGE_SIZE;

  const { t } = useTranslation('admin-settings-usage');

  const {
    data: userUsageResponse,
    isLoading,
    error,
  } = useUserUsage({
    startDate,
    endDate,
    limit: DEFAULT_PAGE_SIZE,
    offset,
  });

  const totalCredits = userUsageResponse?.totalCredits;
  const description =
    totalCredits !== undefined
      ? t('userUsage.totalCredits', {
          credits: totalCredits.toLocaleString(),
        })
      : undefined;

  return (
    <UserUsageTableWidget
      users={userUsageResponse?.data ?? []}
      total={userUsageResponse?.pagination.total ?? 0}
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      isLoading={isLoading}
      error={error}
      description={description}
    />
  );
}

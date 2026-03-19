import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUserUsage } from '@/pages/admin-settings/usage-settings/api';
import {
  UserUsageTableWidget,
  DEFAULT_PAGE_SIZE,
} from '@/widgets/user-usage-table';
import { MonthPicker } from '../MonthPicker';
import { getMonthDateRange } from '../../lib/getMonthDateRange';

export function UserUsageTable() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const handleMonthChange = (newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
  };

  const { startDate, endDate } = getMonthDateRange(year, month);

  const monthPicker = (
    <MonthPicker year={year} month={month} onMonthChange={handleMonthChange} />
  );

  return (
    <UserUsageTableInner
      key={`${year}-${month}`}
      startDate={startDate}
      endDate={endDate}
      headerAction={monthPicker}
    />
  );
}

interface UserUsageTableInnerProps {
  startDate: Date;
  endDate: Date;
  headerAction: React.ReactNode;
}

function UserUsageTableInner({
  startDate,
  endDate,
  headerAction,
}: Readonly<UserUsageTableInnerProps>) {
  const [currentPage, setCurrentPage] = useState(0);
  const offset = currentPage * DEFAULT_PAGE_SIZE;

  const { t } = useTranslation('admin-settings-usage');

  const {
    data: userUsageResponse,
    isLoading,
    error,
  } = useUserUsage({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
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
      headerAction={headerAction}
      description={description}
    />
  );
}

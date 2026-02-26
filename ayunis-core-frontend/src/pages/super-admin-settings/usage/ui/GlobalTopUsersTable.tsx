import { useGlobalUserUsage } from '../api/useGlobalUserUsage';
import { GlobalTopUsersTableWidget } from '@/widgets/global-top-users-table';

interface GlobalTopUsersTableProps {
  startDate?: Date;
  endDate?: Date;
}

export function GlobalTopUsersTable({
  startDate,
  endDate,
}: Readonly<GlobalTopUsersTableProps>) {
  const {
    data: response,
    isLoading,
    error,
  } = useGlobalUserUsage({
    startDate: startDate?.toISOString(),
    endDate: endDate?.toISOString(),
  });

  return (
    <GlobalTopUsersTableWidget
      users={response?.data}
      isLoading={isLoading}
      error={error}
    />
  );
}

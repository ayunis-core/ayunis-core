import type { GlobalUserUsageDto } from '@/shared/api';
import { GlobalTopUsersTableContent } from './GlobalTopUsersTableContent';
import { GlobalTopUsersTableLoading } from './GlobalTopUsersTableLoading';
import { GlobalTopUsersTableError } from './GlobalTopUsersTableError';
import { GlobalTopUsersTableEmpty } from './GlobalTopUsersTableEmpty';

interface GlobalTopUsersTableWidgetProps {
  users?: GlobalUserUsageDto[];
  isLoading: boolean;
  error: unknown;
}

export function GlobalTopUsersTableWidget({
  users,
  isLoading,
  error,
}: Readonly<GlobalTopUsersTableWidgetProps>) {
  if (isLoading) return <GlobalTopUsersTableLoading />;
  if (error) return <GlobalTopUsersTableError error={error} />;
  if (!users?.length) return <GlobalTopUsersTableEmpty />;

  return <GlobalTopUsersTableContent users={users} />;
}

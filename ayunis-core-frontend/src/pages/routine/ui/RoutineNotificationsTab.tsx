import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/widgets/empty-state';
import { PaginationWidget } from '@/widgets/pagination';
import { NotificationListItem } from '@/features/notifications';
import { useRoutineNotifications } from '@/pages/routine/api/useRoutineNotifications';
import { ROUTINE_ITEMS_PER_PAGE } from '@/pages/routine/model/constants';

interface RoutineNotificationsTabProps {
  routineId: string;
  page: number;
}

export function RoutineNotificationsTab({
  routineId,
  page,
}: Readonly<RoutineNotificationsTabProps>) {
  const { t } = useTranslation('routines');
  const { notifications, total, isLoading } = useRoutineNotifications(
    routineId,
    page,
  );

  if (!isLoading && notifications.length === 0 && page === 1) {
    return (
      <EmptyState
        title={t('detail.notificationsEmpty.title')}
        description={t('detail.notificationsEmpty.description')}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2" data-testid="routine-notifications-list">
        {notifications.map((notification) => (
          <NotificationListItem
            key={notification.id}
            notification={notification}
          />
        ))}
      </div>
      <PaginationWidget
        currentPage={page}
        totalPages={Math.ceil(total / ROUTINE_ITEMS_PER_PAGE)}
        to="/routines/$routineId"
        params={{ routineId }}
        buildSearchParams={(targetPage) => ({
          tab: 'notifications',
          page: targetPage,
        })}
      />
    </div>
  );
}

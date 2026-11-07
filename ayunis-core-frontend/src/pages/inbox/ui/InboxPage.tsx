import { useTranslation } from 'react-i18next';
import { CheckCheck } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import FullScreenMessageLayout from '@/layouts/full-screen-message-layout/ui/FullScreenMessageLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { EmptyState } from '@/widgets/empty-state';
import { PaginationWidget } from '@/widgets/pagination';
import {
  NotificationListItem,
  useUnreadNotificationCount,
} from '@/features/notifications';
import { useNotifications } from '@/pages/inbox/api/useNotifications';
import { useMarkAllNotificationsRead } from '@/pages/inbox/api/useMarkAllNotificationsRead';
import { NOTIFICATIONS_PER_PAGE } from '@/pages/inbox/model/constants';

interface InboxPageProps {
  page: number;
}

export default function InboxPage({ page }: Readonly<InboxPageProps>) {
  const { t } = useTranslation('inbox');
  const { notifications, total, isLoading } = useNotifications(page);
  const { unreadCount } = useUnreadNotificationCount();
  const markAllRead = useMarkAllNotificationsRead();
  const hasUnread =
    unreadCount > 0 ||
    notifications.some((notification) => notification.readAt === null);
  const header = (
    <ContentAreaHeader
      breadcrumbs={[{ label: t('page.title') }]}
      action={
        <Button
          variant="outline"
          size="sm"
          data-testid="inbox-mark-all-read"
          disabled={!hasUnread || markAllRead.isPending}
          onClick={() => markAllRead.mutate()}
        >
          <CheckCheck />
          {t('page.markAllRead')}
        </Button>
      }
    />
  );

  if (!isLoading && notifications.length === 0 && page === 1) {
    return (
      <AppLayout>
        <FullScreenMessageLayout header={header}>
          <EmptyState
            title={t('emptyState.title')}
            description={t('emptyState.description')}
          />
        </FullScreenMessageLayout>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={header}
        contentArea={
          <div className="space-y-4">
            <div className="space-y-2" data-testid="inbox-list">
              {notifications.map((notification) => (
                <NotificationListItem
                  key={notification.id}
                  notification={notification}
                />
              ))}
            </div>
            <PaginationWidget
              currentPage={page}
              totalPages={Math.ceil(total / NOTIFICATIONS_PER_PAGE)}
              to="/inbox"
              buildSearchParams={(targetPage) => ({ page: targetPage })}
            />
          </div>
        }
      />
    </AppLayout>
  );
}

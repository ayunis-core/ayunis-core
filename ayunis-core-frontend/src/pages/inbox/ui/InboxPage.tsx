import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCheck } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { cn } from '@ayunis/ui/lib/cn';
import type {
  NotificationResponseDto,
  NotificationType,
} from '@ayunis/api-client/schemas';
import AppLayout from '@/layouts/app-layout';
import FullScreenMessageLayout from '@/layouts/full-screen-message-layout/ui/FullScreenMessageLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { EmptyState } from '@/widgets/empty-state';
import { useUnreadNotificationCount } from '@/features/notifications';
import { useNotifications } from '@/pages/inbox/api/useNotifications';
import { useMarkAllNotificationsRead } from '@/pages/inbox/api/useMarkAllNotificationsRead';
import { useOpenNotification } from '@/pages/inbox/api/useOpenNotification';
import { withOpenNotification } from '@/pages/inbox/lib/with-open-notification';
import { InboxList } from './InboxList';
import { InboxReadFilter } from './InboxReadFilter';
import { InboxTypeFilter } from './InboxTypeFilter';

interface InboxPageProps {
  page: number;
  type?: NotificationType;
  showRead: boolean;
  /** The notification open next to the list; its page is `children`. */
  selectedId?: string;
  children: ReactNode;
}

export default function InboxPage({
  page,
  type,
  showRead,
  selectedId,
  children,
}: Readonly<InboxPageProps>) {
  const { t } = useTranslation('inbox');
  const { notifications, total, isLoading } = useNotifications(
    page,
    type,
    showRead,
  );
  const openNotification = useOpenNotification(selectedId);
  const listed = withOpenNotification(notifications, openNotification, {
    type,
    unreadFirst: showRead,
  });
  const header = (
    <InboxHeader type={type} showRead={showRead} notifications={listed} />
  );

  if (!selectedId && !isLoading && notifications.length === 0 && page === 1) {
    return (
      <AppLayout>
        <FullScreenMessageLayout header={header}>
          <EmptyState
            title={t(showRead ? 'emptyState.title' : 'emptyState.unreadTitle')}
            description={t(
              showRead
                ? 'emptyState.description'
                : 'emptyState.unreadDescription',
            )}
          />
        </FullScreenMessageLayout>
      </AppLayout>
    );
  }

  // Below md only one pane shows: the list, or the open notification.
  return (
    <AppLayout>
      <div className="absolute inset-0 flex flex-col">
        <div className="content-area-page-header">{header}</div>
        <div className="flex min-h-0 flex-1">
          <InboxList
            className={cn(selectedId && 'max-md:hidden')}
            notifications={listed}
            page={page}
            total={total}
            selectedId={selectedId}
          />
          <section
            key={selectedId}
            className={cn(
              'min-w-0 flex-1 overflow-y-auto px-3 pb-4 sm:px-6',
              !selectedId && 'max-md:hidden',
            )}
            data-testid="inbox-detail-pane"
          >
            {selectedId && <BackToList />}
            {children}
          </section>
        </div>
      </div>
    </AppLayout>
  );
}

interface InboxHeaderProps {
  type?: NotificationType;
  showRead: boolean;
  notifications: NotificationResponseDto[];
}

function InboxHeader({
  type,
  showRead,
  notifications,
}: Readonly<InboxHeaderProps>) {
  const { t } = useTranslation('inbox');
  const { unreadCount } = useUnreadNotificationCount();
  const markAllRead = useMarkAllNotificationsRead();
  const hasUnread =
    unreadCount > 0 ||
    notifications.some((notification) => notification.readAt === null);

  return (
    <ContentAreaHeader
      breadcrumbs={[{ label: t('page.title') }]}
      badge={
        <>
          <InboxReadFilter showRead={showRead} />
          {type && <InboxTypeFilter type={type} />}
        </>
      }
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
}

function BackToList() {
  const { t } = useTranslation('inbox');
  return (
    <Button variant="ghost" size="sm" className="-ml-2 md:hidden" asChild>
      <Link to="/inbox" search={true} data-testid="inbox-back-to-list">
        <ArrowLeft />
        {t('detail.back')}
      </Link>
    </Button>
  );
}

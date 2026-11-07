import { useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { CalendarClock, MessageSquare, MessagesSquare } from 'lucide-react';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { Markdown } from '@/widgets/markdown';
import {
  NotificationTypeIcon,
  useMarkNotificationRead,
} from '@/features/notifications';
import { useMyPermissions } from '@/features/permissions';
import {
  NotificationType,
  type NotificationResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useNotification } from '@/pages/notification/api/useNotification';

interface NotificationPageProps {
  notification: NotificationResponseDto;
}

export default function NotificationPage(
  props: Readonly<NotificationPageProps>,
) {
  const { t } = useTranslation('inbox');
  const notification =
    useNotification(props.notification.id).notification ?? props.notification;
  const { mutate: markRead } = useMarkNotificationRead();
  const isUnread = notification.readAt === null;

  // Opening a notification reads it.
  useEffect(() => {
    if (isUnread) markRead(notification.id);
  }, [isUnread, markRead, notification.id]);

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            breadcrumbs={[
              { label: t('page.title'), href: '/inbox' },
              { label: notification.headline },
            ]}
          />
        }
        contentArea={
          <article
            className="mx-auto flex w-full max-w-3xl flex-col gap-6"
            data-testid="notification-detail"
            data-type={notification.type}
          >
            <NotificationHeading notification={notification} />
            <Markdown renderImages={false} className="text-sm">
              {notification.body}
            </Markdown>
            <NotificationActions notification={notification} />
          </article>
        }
      />
    </AppLayout>
  );
}

function NotificationHeading({
  notification,
}: Readonly<NotificationPageProps>) {
  const { t } = useTranslation('inbox');
  return (
    <header className="flex gap-3">
      <NotificationTypeIcon type={notification.type} className="mt-1 size-5" />
      <div className="flex flex-col gap-1">
        <h1
          className="flex flex-wrap items-center gap-2 text-xl font-semibold"
          data-testid="notification-detail-headline"
        >
          {notification.headline}
          {notification.type === NotificationType.routine_error && (
            <Badge variant="destructive">{t('item.error')}</Badge>
          )}
        </h1>
        <p className="text-muted-foreground">{notification.subheadline}</p>
        <p className="text-xs text-muted-foreground">
          {new Date(notification.createdAt).toLocaleString(undefined, {
            dateStyle: 'full',
            timeStyle: 'short',
          })}
        </p>
      </div>
    </header>
  );
}

function NotificationActions({
  notification,
}: Readonly<NotificationPageProps>) {
  const { t } = useTranslation('inbox');
  const { can } = useMyPermissions();
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild data-testid="notification-chat-about-this">
        <Link to="/chat" search={{ notificationId: notification.id }}>
          <MessageSquare />
          {t('detail.chatAboutThis')}
        </Link>
      </Button>
      {notification.routineThreadId && (
        <Button
          asChild
          variant="outline"
          data-testid="notification-open-routine-chat"
        >
          <Link
            to="/chats/$threadId"
            params={{ threadId: notification.routineThreadId }}
          >
            <MessagesSquare />
            {t('detail.openRoutineChat')}
          </Link>
        </Button>
      )}
      {notification.routineId && can('manage_routines') && (
        <Button
          asChild
          variant="outline"
          data-testid="notification-open-routine"
        >
          <Link
            to="/routines/$routineId"
            params={{ routineId: notification.routineId }}
          >
            <CalendarClock />
            {t('detail.openRoutine')}
          </Link>
        </Button>
      )}
    </div>
  );
}

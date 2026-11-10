import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { CalendarClock, MessagesSquare } from 'lucide-react';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import { Markdown } from '@/widgets/markdown';
import { ChatStarter } from '@/widgets/chat-starter';
import { NotificationTypeIcon } from '@/features/notifications';
import { useMyPermissions } from '@/features/permissions';
import {
  NotificationType,
  type NotificationResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { NotificationMedia } from './NotificationMedia';

interface NotificationProps {
  notification: NotificationResponseDto;
}

interface NotificationDetailProps extends NotificationProps {
  selectedModelId?: string;
  isEmbeddingModelEnabled: boolean;
}

export function NotificationDetail({
  notification,
  selectedModelId,
  isEmbeddingModelEnabled,
}: Readonly<NotificationDetailProps>) {
  const { t } = useTranslation('inbox');
  return (
    <article
      className="mx-auto flex w-full max-w-3xl flex-col gap-6"
      data-testid="notification-detail"
      data-type={notification.type}
    >
      <NotificationHeading notification={notification} />
      <NotificationMedia notification={notification} />
      <Markdown renderImages={false} className="text-sm">
        {notification.body}
      </Markdown>
      <NotificationActions notification={notification} />
      <div data-testid="notification-chat-starter">
        <ChatStarter
          sourceNotificationId={notification.id}
          placeholder={t('detail.chatPlaceholder')}
          selectedModelId={selectedModelId}
          isEmbeddingModelEnabled={isEmbeddingModelEnabled}
        />
      </div>
    </article>
  );
}

function NotificationHeading({ notification }: Readonly<NotificationProps>) {
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
        {notification.subheadline && (
          <p
            className="text-muted-foreground"
            data-testid="notification-detail-subheadline"
          >
            {notification.subheadline}
          </p>
        )}
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

function NotificationActions({ notification }: Readonly<NotificationProps>) {
  const { t } = useTranslation('inbox');
  const { can } = useMyPermissions();
  const canOpenRoutine = !!notification.routineId && can('manage_routines');
  if (!notification.routineThreadId && !canOpenRoutine) return null;
  return (
    <div className="flex flex-wrap gap-2">
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
      {notification.routineId && canOpenRoutine && (
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

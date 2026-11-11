import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { Badge } from '@ayunis/ui/components/badge';
import { cn } from '@ayunis/ui/lib/cn';
import { NotificationTypeIcon } from './NotificationTypeIcon';
import { NotificationMarkReadButton } from './NotificationMarkReadButton';
import { NotificationType } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import type { Notification } from '@/features/notifications/model/openapi';
import { formatNotificationTime } from '@/features/notifications/lib/format-notification-time';

interface NotificationListItemProps {
  notification: Notification;
}

export function NotificationListItem({
  notification,
}: Readonly<NotificationListItemProps>) {
  const { t } = useTranslation('inbox');
  const isUnread = notification.readAt === null;
  const isError = notification.type === NotificationType.routine_error;

  return (
    // The link stretches over the whole item so the mark-read button can sit
    // above it instead of being nested inside an anchor.
    <Item
      variant="outline"
      className={cn(
        'relative has-[a:hover]:bg-accent/50',
        isUnread && 'border-brand',
      )}
      data-testid="notification-item"
      data-unread={isUnread}
      data-type={notification.type}
    >
      <ItemMedia variant="icon">
        <NotificationTypeIcon type={notification.type} />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          {isUnread && (
            <span
              className="size-2 shrink-0 rounded-full bg-brand"
              data-testid="notification-unread-dot"
              aria-label={t('item.unread')}
            />
          )}
          <Link
            to="/inbox/$notificationId"
            params={{ notificationId: notification.id }}
            className="outline-none after:absolute after:inset-0 after:rounded-md focus-visible:after:ring-[3px] focus-visible:after:ring-ring/50"
          >
            <span data-testid="notification-item-headline">
              {notification.headline}
            </span>
          </Link>
          {isError && <Badge variant="destructive">{t('item.error')}</Badge>}
        </ItemTitle>
        {notification.subheadline && (
          <ItemDescription data-testid="notification-item-subheadline">
            {notification.subheadline}
          </ItemDescription>
        )}
      </ItemContent>
      <span className="shrink-0 text-xs text-muted-foreground">
        {formatNotificationTime(notification.createdAt)}
      </span>
      {isUnread && (
        <ItemActions className="relative z-10">
          <NotificationMarkReadButton notificationId={notification.id} />
        </ItemActions>
      )}
    </Item>
  );
}

import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { Badge } from '@ayunis/ui/components/badge';
import { NotificationTypeIcon } from '@/features/notifications';
import { NotificationType } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import type { Notification } from '@/pages/inbox/model/openapi';
import { formatNotificationTime } from '@/pages/inbox/lib/format-notification-time';

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
    <Item
      variant="outline"
      asChild
      data-testid="notification-item"
      data-unread={isUnread}
      data-type={notification.type}
    >
      <Link
        to="/inbox/$notificationId"
        params={{ notificationId: notification.id }}
      >
        <ItemMedia variant="icon">
          <NotificationTypeIcon type={notification.type} />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>
            {isUnread && (
              <span
                className="size-2 shrink-0 rounded-full bg-primary"
                data-testid="notification-unread-dot"
                aria-label={t('item.unread')}
              />
            )}
            <span data-testid="notification-item-headline">
              {notification.headline}
            </span>
            {isError && <Badge variant="destructive">{t('item.error')}</Badge>}
          </ItemTitle>
          <ItemDescription>{notification.subheadline}</ItemDescription>
        </ItemContent>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatNotificationTime(notification.createdAt)}
        </span>
      </Link>
    </Item>
  );
}

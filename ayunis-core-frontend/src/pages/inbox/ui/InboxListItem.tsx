import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { Badge } from '@ayunis/ui/components/badge';
import { cn } from '@ayunis/ui/lib/cn';
import {
  NotificationMarkReadButton,
  NotificationTypeIcon,
} from '@/features/notifications';
import { formatRelativeDate } from '@/shared/lib/format-relative-date';
import {
  NotificationType,
  type NotificationResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';

interface InboxListItemProps {
  notification: NotificationResponseDto;
  isSelected: boolean;
}

export function InboxListItem({
  notification,
  isSelected,
}: Readonly<InboxListItemProps>) {
  const { t, i18n } = useTranslation('inbox');
  const isUnread = notification.readAt === null;

  return (
    // The link stretches over the whole item so the mark-read button can sit
    // above it instead of being nested inside an anchor.
    <Item
      size="sm"
      className={cn(
        'relative flex-nowrap items-start gap-3 px-3 has-[a:hover]:bg-accent/50',
        isSelected && 'bg-accent has-[a:hover]:bg-accent',
      )}
      data-testid="notification-item"
      data-unread={isUnread}
      data-type={notification.type}
      data-selected={isSelected}
    >
      <ItemMedia className="pt-0.5">
        <NotificationTypeIcon type={notification.type} className="size-4" />
      </ItemMedia>
      <ItemContent className="min-w-0 gap-0.5">
        <ItemTitle className="w-full items-start">
          <Link
            to="/inbox/$notificationId"
            params={{ notificationId: notification.id }}
            search={true}
            className="outline-none after:absolute after:inset-0 after:rounded-md focus-visible:after:ring-[3px] focus-visible:after:ring-ring/50"
          >
            <span
              className="line-clamp-2"
              data-testid="notification-item-headline"
            >
              {notification.headline}
            </span>
          </Link>
          {isUnread && (
            <span
              className="mt-1.5 ml-auto size-2 shrink-0 rounded-full bg-brand"
              data-testid="notification-unread-dot"
              aria-label={t('item.unread')}
            />
          )}
        </ItemTitle>
        <p className="flex min-w-0 gap-1 text-xs text-muted-foreground">
          {notification.subheadline && (
            <>
              <span
                className="truncate"
                data-testid="notification-item-subheadline"
              >
                {notification.subheadline}
              </span>
              <span aria-hidden>·</span>
            </>
          )}
          <time className="shrink-0" dateTime={notification.createdAt}>
            {formatRelativeDate(notification.createdAt, i18n.language)}
          </time>
        </p>
        {notification.type === NotificationType.routine_error && (
          <Badge variant="outline" className="mt-1">
            {t('item.error')}
          </Badge>
        )}
      </ItemContent>
      {isUnread && (
        <ItemActions className="relative z-10 -my-1 -mr-2">
          <NotificationMarkReadButton
            notificationId={notification.id}
            size="icon-sm"
          />
        </ItemActions>
      )}
    </Item>
  );
}

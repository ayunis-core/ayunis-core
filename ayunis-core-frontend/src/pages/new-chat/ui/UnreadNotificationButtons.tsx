import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { cn } from '@ayunis/ui/lib/cn';
import {
  NOTIFICATION_TYPE_APPEARANCE,
  NotificationTypeIcon,
  formatUnreadCount,
  isKnownNotificationType,
  useUnreadNotificationCount,
} from '@/features/notifications';
import type { NotificationType } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { CHAT_INPUT_TEXT_INSET_CLASS } from '@/widgets/chat-input';

interface UnreadNotificationButtonsProps {
  /** Collapses with the other compose extras once a new chat is sent. */
  isCollapsed: boolean;
}

export function UnreadNotificationButtons({
  isCollapsed,
}: Readonly<UnreadNotificationButtonsProps>) {
  const { unreadByType } = useUnreadNotificationCount();
  const counts = new Map<string, number>(
    unreadByType.map(({ type, count }) => [type, count]),
  );
  const unreadTypes = Object.keys(NOTIFICATION_TYPE_APPEARANCE)
    .filter(isKnownNotificationType)
    .filter((type) => (counts.get(type) ?? 0) > 0);
  if (unreadTypes.length === 0) return null;

  // The outer box clips while collapsing; the inner row's top padding keeps
  // room for the count badges above the buttons.
  return (
    <div
      className={cn(
        'new-chat-dock-extras overflow-hidden',
        isCollapsed && 'new-chat-dock-extras--collapsed',
      )}
      aria-hidden={isCollapsed}
      data-testid="new-chat-unread-notifications"
    >
      <div
        className={cn(
          'flex w-full justify-start gap-2 pt-1.5',
          CHAT_INPUT_TEXT_INSET_CLASS,
        )}
      >
        {unreadTypes.map((type) => (
          <UnreadNotificationButton
            key={type}
            type={type}
            count={counts.get(type) ?? 0}
          />
        ))}
      </div>
    </div>
  );
}

function UnreadNotificationButton({
  type,
  count,
}: Readonly<{ type: NotificationType; count: number }>) {
  const { t } = useTranslation('chat');
  const label = t(`newChat.unreadNotifications.${type}`, { count });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" size="icon" className="relative" asChild>
          <Link
            to="/inbox"
            search={{ type }}
            aria-label={label}
            data-testid="new-chat-unread-notifications-button"
            data-type={type}
          >
            <NotificationTypeIcon type={type} />
            <span
              className={cn(
                'absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium leading-none',
                NOTIFICATION_TYPE_APPEARANCE[type].badgeClassName,
              )}
              data-testid="new-chat-unread-notifications-count"
              aria-hidden
            >
              {formatUnreadCount(count)}
            </span>
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

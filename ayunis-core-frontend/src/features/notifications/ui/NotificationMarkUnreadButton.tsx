import { useTranslation } from 'react-i18next';
import type { ComponentProps } from 'react';
import { CircleDot } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { useMarkNotificationUnread } from '@/features/notifications/api/useMarkNotificationUnread';

interface NotificationMarkUnreadButtonProps {
  notificationId: string;
  size?: ComponentProps<typeof Button>['size'];
}

export function NotificationMarkUnreadButton({
  notificationId,
  size = 'icon',
}: Readonly<NotificationMarkUnreadButtonProps>) {
  const { t } = useTranslation('inbox');
  const { mutate: markUnread, isPending } = useMarkNotificationUnread();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size={size}
          disabled={isPending}
          onClick={() => markUnread(notificationId)}
          aria-label={t('item.markUnread')}
          data-testid="notification-mark-unread"
        >
          <CircleDot />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{t('item.markUnread')}</TooltipContent>
    </Tooltip>
  );
}

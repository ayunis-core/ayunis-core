import { useTranslation } from 'react-i18next';
import type { ComponentProps } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { useMarkNotificationRead } from '@/features/notifications/api/useMarkNotificationRead';

interface NotificationMarkReadButtonProps {
  notificationId: string;
  size?: ComponentProps<typeof Button>['size'];
}

export function NotificationMarkReadButton({
  notificationId,
  size = 'icon',
}: Readonly<NotificationMarkReadButtonProps>) {
  const { t } = useTranslation('inbox');
  const { mutate: markRead, isPending } = useMarkNotificationRead();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size={size}
          disabled={isPending}
          onClick={() => markRead(notificationId)}
          aria-label={t('item.markRead')}
          data-testid="notification-mark-read"
        >
          <Check />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{t('item.markRead')}</TooltipContent>
    </Tooltip>
  );
}

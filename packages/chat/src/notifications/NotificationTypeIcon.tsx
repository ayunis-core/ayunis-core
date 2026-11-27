import { cn } from '@ayunis/ui/lib/cn';
import { NotificationType } from '@ayunis/api-client/schemas';
import { NOTIFICATION_TYPE_APPEARANCE } from './notification-type-appearance';

interface NotificationTypeIconProps {
  type: NotificationType;
  className?: string;
}

export function NotificationTypeIcon({
  type,
  className,
}: Readonly<NotificationTypeIconProps>) {
  const { icon: Icon, iconClassName } = NOTIFICATION_TYPE_APPEARANCE[type];
  return (
    <Icon
      className={cn(iconClassName, className)}
      data-testid={
        type === NotificationType.routine_error
          ? 'notification-error-icon'
          : undefined
      }
      aria-hidden
    />
  );
}

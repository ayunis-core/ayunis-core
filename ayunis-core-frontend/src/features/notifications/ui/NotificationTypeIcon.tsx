import { Bell, CircleAlert } from 'lucide-react';
import { cn } from '@ayunis/ui/lib/cn';
import { NotificationType } from '@/shared/api/generated/ayunisCoreAPI.schemas';

interface NotificationTypeIconProps {
  type: NotificationType;
  className?: string;
}

/** Error notifications (failed routine runs) stand out from routine findings. */
export function NotificationTypeIcon({
  type,
  className,
}: Readonly<NotificationTypeIconProps>) {
  if (type === NotificationType.routine_error) {
    return (
      <CircleAlert
        className={cn('text-destructive', className)}
        data-testid="notification-error-icon"
        aria-hidden
      />
    );
  }
  return (
    <Bell className={cn('text-muted-foreground', className)} aria-hidden />
  );
}

import type { LucideIcon } from 'lucide-react';
import { CalendarClock, CircleAlert } from 'lucide-react';
import type { NotificationType } from '@/shared/api/generated/ayunisCoreAPI.schemas';

interface NotificationTypeAppearance {
  icon: LucideIcon;
  iconClassName: string;
  /** The type's tab label in the new chat page's unread panel. */
  labelClassName: string;
  /** The unread count in that tab. */
  countClassName: string;
}

/**
 * Every notification type needs an entry. The order is the order of the
 * unread tabs on the new chat page.
 */
export const NOTIFICATION_TYPE_APPEARANCE: Record<
  NotificationType,
  NotificationTypeAppearance
> = {
  // Failed routine runs stand out from routine findings.
  routine_error: {
    icon: CircleAlert,
    iconClassName: 'text-destructive',
    labelClassName: 'text-destructive',
    countClassName: 'text-destructive',
  },
  routine: {
    icon: CalendarClock,
    iconClassName: 'text-muted-foreground',
    labelClassName: '',
    countClassName: 'text-brand',
  },
};

export function isKnownNotificationType(
  type: string,
): type is NotificationType {
  return Object.hasOwn(NOTIFICATION_TYPE_APPEARANCE, type);
}

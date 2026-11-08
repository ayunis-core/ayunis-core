import type { LucideIcon } from 'lucide-react';
import { CalendarClock, CircleAlert, Megaphone } from 'lucide-react';
import type { NotificationType } from '@/shared/api/generated/ayunisCoreAPI.schemas';

interface NotificationTypeAppearance {
  icon: LucideIcon;
  iconClassName: string;
  /** The unread count badge on the new chat page. */
  badgeClassName: string;
}

/**
 * Every notification type needs an entry. The order is the order of the
 * unread buttons on the new chat page.
 */
export const NOTIFICATION_TYPE_APPEARANCE: Record<
  NotificationType,
  NotificationTypeAppearance
> = {
  routine: {
    icon: CalendarClock,
    iconClassName: 'text-muted-foreground',
    badgeClassName: 'bg-brand text-brand-foreground',
  },
  // Failed routine runs stand out from routine findings.
  routine_error: {
    icon: CircleAlert,
    iconClassName: 'text-destructive',
    badgeClassName: 'bg-destructive text-white',
  },
  release_note: {
    icon: Megaphone,
    iconClassName: 'text-muted-foreground',
    badgeClassName: 'bg-brand text-brand-foreground',
  },
};

export function isKnownNotificationType(
  type: string,
): type is NotificationType {
  return Object.hasOwn(NOTIFICATION_TYPE_APPEARANCE, type);
}

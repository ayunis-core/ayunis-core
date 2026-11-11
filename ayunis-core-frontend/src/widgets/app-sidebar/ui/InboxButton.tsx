import { Inbox } from 'lucide-react';
import { Link, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { SidebarMenuButton } from '@ayunis/ui/components/sidebar';
import { useIsFeatureEnabled } from '@/features/feature-toggles';
import {
  formatUnreadCount,
  useUnreadNotificationCount,
} from '@/features/notifications';

/** Not tied to manage_routines: notifications stay readable without it. */
export function InboxButton() {
  const routinesEnabled = useIsFeatureEnabled('routinesEnabled');
  if (!routinesEnabled) return null;
  return <RoutinesInboxButton />;
}

function RoutinesInboxButton() {
  const { t } = useTranslation('common');
  const location = useLocation();
  const { unreadCount } = useUnreadNotificationCount();
  const unreadBadge = formatUnreadCount(unreadCount);

  return (
    <SidebarMenuButton
      asChild
      className="relative size-8 flex-shrink-0 overflow-visible"
      size="sm"
      isActive={location.pathname.startsWith('/inbox')}
    >
      <Link
        to="/inbox"
        aria-label={t('sidebar.inbox')}
        title={t('sidebar.inbox')}
        data-testid="sidebar-inbox"
      >
        <Inbox className="size-4" />
        {unreadBadge && (
          <span
            className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium leading-none text-primary-foreground"
            data-testid="sidebar-inbox-unread-count"
          >
            {unreadBadge}
          </span>
        )}
      </Link>
    </SidebarMenuButton>
  );
}

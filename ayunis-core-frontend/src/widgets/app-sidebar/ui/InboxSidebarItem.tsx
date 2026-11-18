import { Inbox } from 'lucide-react';
import { Link, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@ayunis/ui/components/sidebar';
import { useIsFeatureEnabled } from '@/features/feature-toggles';
import {
  formatUnreadCount,
  useUnreadNotificationCount,
} from '@/features/notifications';

/** Not tied to manage_routines: notifications stay readable without it. */
export function InboxSidebarItem() {
  const routinesEnabled = useIsFeatureEnabled('routinesEnabled');
  if (!routinesEnabled) return null;
  return <RoutinesInboxSidebarItem />;
}

function RoutinesInboxSidebarItem() {
  const { t } = useTranslation('common');
  const location = useLocation();
  const { unreadCount } = useUnreadNotificationCount();
  const unreadBadge = formatUnreadCount(unreadCount);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={location.pathname.startsWith('/inbox')}
      >
        <Link to="/inbox" data-testid="sidebar-inbox">
          <Inbox />
          <span>{t('sidebar.inbox')}</span>
        </Link>
      </SidebarMenuButton>
      {unreadBadge && (
        <SidebarMenuBadge
          className="rounded-full bg-brand text-brand-foreground peer-hover/menu-button:text-brand-foreground peer-data-[active=true]/menu-button:text-brand-foreground"
          data-testid="sidebar-inbox-unread-count"
        >
          {unreadBadge}
        </SidebarMenuBadge>
      )}
    </SidebarMenuItem>
  );
}

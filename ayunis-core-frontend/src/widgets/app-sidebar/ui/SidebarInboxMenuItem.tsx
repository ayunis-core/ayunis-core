import { Inbox } from 'lucide-react';
import { Link, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@ayunis/ui/components/sidebar';
import { formatUnreadCount } from '@/features/notifications';

interface SidebarInboxMenuItemProps {
  unreadCount: number;
  badgeClassName?: string;
}

export function SidebarInboxMenuItem({
  unreadCount,
  badgeClassName,
}: Readonly<SidebarInboxMenuItemProps>) {
  const { t } = useTranslation('common');
  const location = useLocation();
  const unreadBadge = formatUnreadCount(unreadCount);
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={location.pathname.startsWith('/inbox')}
      >
        <Link to="/inbox" data-testid="sidebar-footer-inbox">
          <Inbox />
          <span>{t('sidebar.inbox')}</span>
        </Link>
      </SidebarMenuButton>
      {unreadBadge && (
        <SidebarMenuBadge
          data-testid="sidebar-inbox-unread-count"
          className={badgeClassName}
        >
          {unreadBadge}
        </SidebarMenuBadge>
      )}
    </SidebarMenuItem>
  );
}

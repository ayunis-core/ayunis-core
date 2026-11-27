import { Gift } from 'lucide-react';
import { Link, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from '@ayunis/ui/components/sidebar';
import { useAdventCalendar } from '@/features/advent-calendar';

export function AdventCalendarSidebarItem() {
  const { t } = useTranslation('common');
  const location = useLocation();
  const { isShown } = useAdventCalendar();
  if (!isShown) return null;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={location.pathname.startsWith('/advent-calendar')}
      >
        <Link to="/advent-calendar" data-testid="sidebar-advent-calendar">
          <Gift />
          <span>{t('sidebar.adventCalendar')}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

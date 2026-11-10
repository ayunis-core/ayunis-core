import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { Link, useLocation } from '@tanstack/react-router';
import { Button } from '@ayunis/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { Avatar, AvatarFallback } from '@ayunis/ui/components/avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import { cn } from '@ayunis/ui/lib/cn';
import {
  isNavItemActive,
  type SidebarNavItem,
} from '@/widgets/app-sidebar/model/useSidebarNav';
import { useSidebarInboxCount } from '@/widgets/app-sidebar/model/useSidebarInboxCount';
import { useMe } from '@/widgets/app-sidebar/api/useMe';
import { SidebarNavLink } from '@/widgets/app-sidebar/ui/SidebarNavLink';
import { UserMenuContent } from '@/widgets/app-sidebar/ui/SidebarUserMenu';
import { InboxCountBadge } from './InboxCountBadge';

const RAIL_BUTTON_CLASS =
  'relative text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground';
const RAIL_ACTIVE_CLASS = 'bg-sidebar-accent text-sidebar-accent-foreground';

function RailTooltip({
  label,
  children,
}: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

export function RailNavButton({
  item,
  emphasized = false,
}: Readonly<{ item: SidebarNavItem; emphasized?: boolean }>) {
  const location = useLocation();
  const isActive = isNavItemActive(location.pathname, item);
  return (
    <RailTooltip label={item.title}>
      <Button
        variant={emphasized ? 'outline' : 'ghost'}
        size="icon-sm"
        asChild
        className={cn(
          !emphasized && RAIL_BUTTON_CLASS,
          isActive && RAIL_ACTIVE_CLASS,
          item.disabled && 'pointer-events-none opacity-50',
        )}
      >
        <SidebarNavLink item={item}>
          <item.icon />
          <span className="sr-only">{item.title}</span>
        </SidebarNavLink>
      </Button>
    </RailTooltip>
  );
}

export function RailInboxButton() {
  const unreadCount = useSidebarInboxCount();
  const location = useLocation();
  const isActive = location.pathname.startsWith('/inbox');
  return (
    <RailTooltip label="Posteingang">
      <Button
        variant="ghost"
        size="icon-sm"
        asChild
        className={cn(RAIL_BUTTON_CLASS, isActive && RAIL_ACTIVE_CLASS)}
      >
        <Link to="/inbox" data-testid="sidebar-footer-inbox">
          <Inbox />
          <span className="sr-only">Posteingang</span>
          <InboxCountBadge
            unreadCount={unreadCount}
            showCount={false}
            className="top-1 right-1"
          />
        </Link>
      </Button>
    </RailTooltip>
  );
}

function initialsOf(name: string | undefined): string {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

export function RailUserMenu() {
  const { user } = useMe();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="rounded-full"
          data-testid="menu"
          aria-label={user?.name ?? 'Konto'}
        >
          <Avatar className="size-7">
            <AvatarFallback className="text-xs">
              {initialsOf(user?.name)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <UserMenuContent side="right" className="min-w-56 rounded-lg" />
    </DropdownMenu>
  );
}

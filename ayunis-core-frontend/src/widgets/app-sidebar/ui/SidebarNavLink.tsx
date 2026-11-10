import type { ReactNode } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from '@ayunis/ui/components/sidebar';
import {
  isNavItemActive,
  type SidebarNavItem,
} from '@/widgets/app-sidebar/model/useSidebarNav';

interface SidebarNavLinkProps {
  item: SidebarNavItem;
  className?: string;
  children: ReactNode;
}

export function SidebarNavLink({
  item,
  className,
  children,
  ...props
}: Readonly<SidebarNavLinkProps>) {
  if (item.external) {
    return (
      <a
        {...props}
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {children}
      </a>
    );
  }
  return (
    <Link
      {...props}
      to={item.url}
      data-testid={item.testId}
      aria-disabled={item.disabled}
      className={className}
    >
      {children}
    </Link>
  );
}

export function SidebarNavMenuItems({
  items,
}: Readonly<{ items: SidebarNavItem[] }>) {
  const location = useLocation();
  return items.map((item) => (
    <SidebarMenuItem key={item.id}>
      <SidebarMenuButton
        asChild
        isActive={isNavItemActive(location.pathname, item)}
      >
        <SidebarNavLink item={item}>
          <item.icon />
          <span>{item.title}</span>
        </SidebarNavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  ));
}

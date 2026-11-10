import { ChevronRight, Ellipsis } from 'lucide-react';
import { useLocation } from '@tanstack/react-router';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@ayunis/ui/components/collapsible';
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@ayunis/ui/components/sidebar';
import {
  isNavItemActive,
  type SidebarNav,
  type SidebarNavItem,
} from '@/widgets/app-sidebar/model/useSidebarNav';
import { useSidebarInboxCount } from '@/widgets/app-sidebar/model/useSidebarInboxCount';
import {
  SidebarNavLink,
  SidebarNavMenuItems,
} from '@/widgets/app-sidebar/ui/SidebarNavLink';
import { SidebarInboxMenuItem } from '@/widgets/app-sidebar/ui/SidebarInboxMenuItem';

function MoreMenu({ items }: Readonly<{ items: SidebarNavItem[] }>) {
  const location = useLocation();
  const hasActive = items.some((item) =>
    isNavItemActive(location.pathname, item),
  );
  return (
    <Collapsible defaultOpen={hasActive} className="group/more">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton className="text-muted-foreground">
            <Ellipsis />
            <span>Mehr</span>
            <ChevronRight className="ml-auto transition-transform group-data-[state=open]/more:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {items.map((item) => (
              <SidebarMenuSubItem key={item.id}>
                <SidebarMenuSubButton
                  asChild
                  isActive={isNavItemActive(location.pathname, item)}
                >
                  <SidebarNavLink item={item}>
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarNavLink>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function LinearNav({ nav }: Readonly<{ nav: SidebarNav }>) {
  const unreadCount = useSidebarInboxCount();
  return (
    <SidebarGroup>
      <SidebarMenu>
        <SidebarNavMenuItems
          items={nav.primary.filter((item) => item.id === 'new-chat')}
        />
        {nav.routinesEnabled && (
          <SidebarInboxMenuItem
            unreadCount={unreadCount}
            badgeClassName="rounded-full bg-brand text-brand-foreground peer-hover/menu-button:text-brand-foreground peer-data-[active=true]/menu-button:text-brand-foreground"
          />
        )}
        <SidebarNavMenuItems
          items={nav.primary.filter((item) => item.id !== 'new-chat')}
        />
        <MoreMenu items={nav.secondary} />
      </SidebarMenu>
    </SidebarGroup>
  );
}

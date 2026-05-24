import React from 'react';
import {
  User2,
  ChevronUp,
  Settings2,
  LogOut,
  Plus,
  Bot,
  Brain,
  Sparkles,
  Store,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/shared/ui/shadcn/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/shadcn/dropdown-menu';
import { ChatsSidebarGroup } from './ChatsSidebarGroup';
import { SidebarHeaderControls } from './SidebarHeaderControls';
import { SidebarVerticalBrand } from './SidebarVerticalBrand';
import { useMe } from '../api/useMe';
import { useLogout } from '../api/useLogout';
import { Link, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import useKeyboardShortcut from '@/features/useKeyboardShortcut';
import { useNavigate } from '@tanstack/react-router';
import { MeResponseDtoSystemRole } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useFeatureToggles } from '@/features/feature-toggles';
import { useMarketplaceConfig } from '@/features/marketplace';
import { cn } from '@/shared/lib/shadcn/utils';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useMe();
  const { logout } = useLogout();
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { closeMobileWithCleanup, state } = useSidebar();
  const featureToggles = useFeatureToggles();
  const marketplace = useMarketplaceConfig();
  const location = useLocation();
  const isCollapsed = state === 'collapsed';

  useKeyboardShortcut(['j', 'Meta'], () => {
    void navigate({ to: '/chat' });
  });

  const sidebarToggleLabel = isCollapsed
    ? t('sidebar.expandSidebar')
    : t('sidebar.collapseSidebar');

  // Menu items.
  const items = [
    {
      title: t('sidebar.newChat'),
      url: '/chat',
      icon: Plus,
    },
    ...(featureToggles.agentsEnabled
      ? [
          {
            title: t('sidebar.agents'),
            url: '/agents',
            icon: Bot,
          },
        ]
      : []),
    ...(featureToggles.skillsEnabled
      ? [
          {
            title: t('sidebar.skills'),
            url: '/skills',
            icon: Sparkles,
          },
        ]
      : []),
    ...(featureToggles.knowledgeBasesEnabled
      ? [
          {
            title: t('sidebar.knowledge'),
            url: '/knowledge-bases',
            icon: Brain,
          },
        ]
      : []),
  ];

  return (
    <Sidebar
      {...props}
      collapsible="icon"
      variant="inset"
      data-testid="sidebar"
    >
      <SidebarHeader>
        <SidebarHeaderControls
          isCollapsed={isCollapsed}
          sidebarToggleLabel={sidebarToggleLabel}
        />
      </SidebarHeader>

      <SidebarContent className={isCollapsed ? 'flex-none' : undefined}>
        <SidebarGroup>
          <SidebarMenu>
            {items.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={
                    item.url === '/chat'
                      ? location.pathname === '/chat'
                      : location.pathname.startsWith(item.url)
                  }
                >
                  <Link to={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            {marketplace.enabled && marketplace.url && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={t('sidebar.marketplace')}>
                  <a
                    href={marketplace.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Store />
                    <span>{t('sidebar.marketplace')}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroup>

        <ChatsSidebarGroup />
      </SidebarContent>

      <SidebarVerticalBrand />

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem className={cn(isCollapsed && 'flex justify-center')}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size={isCollapsed ? 'default' : 'lg'}
                  className={cn(
                    'data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground',
                    isCollapsed && 'justify-center',
                  )}
                  data-testid="menu"
                  tooltip={user?.name ?? t('sidebar.accountSettings')}
                >
                  <User2 className="size-4 shrink-0" />
                  {!isCollapsed && (
                    <>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">
                          {user?.name}
                        </span>
                        <span className="truncate text-xs">{user?.email}</span>
                      </div>
                      <ChevronUp className="ml-auto size-4 shrink-0" />
                    </>
                  )}
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side={isCollapsed ? 'right' : 'bottom'}
                align={isCollapsed ? 'start' : 'end'}
                sideOffset={4}
              >
                <DropdownMenuItem asChild>
                  <Link to="/settings/general" onClick={closeMobileWithCleanup}>
                    <User2 />
                    {t('sidebar.accountSettings')}
                  </Link>
                </DropdownMenuItem>
                {user?.role === 'admin' && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin-settings" onClick={closeMobileWithCleanup}>
                      <Settings2 />
                      {t('sidebar.adminSettings')}
                    </Link>
                  </DropdownMenuItem>
                )}
                {user?.systemRole === MeResponseDtoSystemRole.super_admin && (
                  <DropdownMenuItem asChild>
                    <Link
                      to="/super-admin-settings"
                      onClick={closeMobileWithCleanup}
                    >
                      <Settings2 />
                      {t('sidebar.superAdminSettings')}
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={logout}>
                  <LogOut />
                  {t('sidebar.signOut')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

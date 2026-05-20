import React from 'react';
import {
  User2,
  ChevronUp,
  Settings2,
  LogOut,
  Plus,
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
} from '@/shared/ui/shadcn/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/shadcn/dropdown-menu';
import { ChatsSidebarGroup } from './ChatsSidebarGroup';
import { useMe } from '../api/useMe';
import { useLogout } from '../api/useLogout';
import { Link, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import useKeyboardShortcut from '@/features/useKeyboardShortcut';
import { useBranding } from '@/features/useBranding';
import { useNavigate } from '@tanstack/react-router';
import brandIconLight from '@/shared/assets/brand/brand-icon-round-light.svg';
import brandIconDark from '@/shared/assets/brand/brand-icon-round-dark.svg';
import { useTheme } from '@/features/theme';
import { useSidebar } from '@/shared/ui/shadcn/sidebar';
import { MeResponseDtoSystemRole } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import config from '@/shared/config';
import { ReleaseNotesButton } from './ReleaseNotesButton';
import { useFeatureToggles } from '@/features/feature-toggles';
import { useMarketplaceConfig } from '@/features/marketplace';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { theme } = useTheme();
  const { user } = useMe();
  const { branding } = useBranding();
  const { logout } = useLogout();
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { closeMobileWithCleanup } = useSidebar();
  const featureToggles = useFeatureToggles();
  const marketplace = useMarketplaceConfig();
  const location = useLocation();
  useKeyboardShortcut(['j', 'Meta'], () => {
    void navigate({ to: '/chat' });
  });

  // Menu items.
  const items = [
    {
      title: t('sidebar.newChat'),
      url: '/chat',
      icon: Plus,
    },
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
    <Sidebar {...props} variant="inset" data-testid="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-between w-full px-2 py-1.5">
              <Link to="/" className="flex items-center gap-2 flex-1 min-w-0">
                <img
                  src={
                    branding?.faviconUrl ??
                    (theme === 'dark' ? brandIconDark : brandIconLight)
                  }
                  alt={branding?.displayName ?? config.app.name}
                  className="size-6 shrink-0 rounded-sm object-cover"
                  crossOrigin="anonymous"
                />
                <span className="truncate text-sm font-semibold">
                  {branding?.displayName ?? config.app.name}
                </span>
              </Link>
              {config.features.announcableOrgId && <ReleaseNotesButton />}
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {items.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
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
                <SidebarMenuButton asChild>
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

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  data-testid="menu"
                >
                  <User2 className="size-4" />
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user?.name}</span>
                    <span className="truncate text-xs">{user?.email}</span>
                  </div>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
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

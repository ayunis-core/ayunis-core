import React from 'react';
import {
  User2,
  ChevronUp,
  Settings2,
  LogOut,
  Plus,
  Brain,
  Sparkles,
  FolderOpen,
  Store,
  GraduationCap,
  CalendarClock,
  Inbox,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@ayunis/ui/components/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import { ChatsSidebarGroup } from './ChatsSidebarGroup';
import { FavoritesSidebarGroup } from './FavoritesSidebarGroup';
import { useMe } from '@/widgets/app-sidebar/api/useMe';
import { useLogout } from '@/widgets/app-sidebar/api/useLogout';
import { Link, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import useKeyboardShortcut from '@/features/useKeyboardShortcut';
import { useNavigate } from '@tanstack/react-router';
import brandFullLight from '@/shared/assets/brand/brand-full-light.svg';
import brandFullDark from '@/shared/assets/brand/brand-full-dark.svg';
import { useTheme } from '@/features/theme';
import { MeResponseDtoSystemRole } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { ReleaseNotesButton } from './ReleaseNotesButton';
import { useMarketplaceConfig } from '@/features/marketplace';
import { useIsFeatureEnabled } from '@/features/feature-toggles';
import {
  allowedSettingsSections,
  useAuthorization,
} from '@/features/permissions';
import {
  useIsAcademyAddonActive,
  useAcademyAccessStatus,
  ACADEMY_LANDING_PAGE_URL,
} from '@/features/academy';
import { OnboardingCard } from './OnboardingCard';
import { useMobileSidebarNavigationHandler } from '@/widgets/app-sidebar/hooks/useMobileSidebarNavigationHandler';
import {
  formatUnreadCount,
  useUnreadNotificationCount,
} from '@/features/notifications';

const NAVIGATION_TEST_IDS: Partial<Record<string, string>> = {
  '/chat': 'sidebar-navigation-new-chat',
  '/routines': 'sidebar-navigation-routines',
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { theme } = useTheme();
  const { user } = useMe();
  const authorization = useAuthorization();
  // Admins, managers granted a settings-relevant permission (e.g. team
  // management) and team admins get the settings entry point.
  const canOpenSettings = allowedSettingsSections(authorization).length > 0;
  const { logout } = useLogout();
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const handleMobileNavigation = useMobileSidebarNavigationHandler();
  const marketplace = useMarketplaceConfig();
  const routinesEnabled = useIsFeatureEnabled('routinesEnabled');
  const canManageRoutines =
    routinesEnabled && authorization.can('manage_routines');
  const { unreadCount } = useUnreadNotificationCount();
  const unreadBadge = formatUnreadCount(unreadCount);
  const academyAddonActive = useIsAcademyAddonActive();
  const { isGated: isAcademyGated } = useAcademyAccessStatus();
  const location = useLocation();
  useKeyboardShortcut(['j', 'Meta'], () => {
    // Mirrors the disabled "New chat" item below — otherwise the shortcut
    // bypasses the gate entirely.
    if (isAcademyGated) return;
    void navigate({ to: '/chat' });
  });

  // Menu items.
  const items = [
    {
      title: t('sidebar.newChat'),
      url: '/chat',
      icon: Plus,
      exact: true,
      // Starting a conversation is a write, so it is blocked without a
      // certificate. Existing chats stay reachable.
      disabled: isAcademyGated,
    },
    {
      title: t('sidebar.workspaces'),
      url: '/workspaces',
      icon: FolderOpen,
      exact: true,
    },
    {
      title: t('sidebar.skills'),
      url: '/skills',
      icon: Sparkles,
    },
    {
      title: t('sidebar.knowledge'),
      url: '/knowledge-bases',
      icon: Brain,
    },
    ...(canManageRoutines
      ? [
          {
            title: t('sidebar.routines'),
            url: '/routines',
            icon: CalendarClock,
          },
        ]
      : []),
  ];

  return (
    <Sidebar
      {...props}
      variant="inset"
      data-testid="sidebar"
      onClickCapture={handleMobileNavigation}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex h-12 items-center justify-between w-full p-2">
              <Link to="/" aria-label="Ayunis Core" className="inline-flex">
                <img
                  src={theme === 'dark' ? brandFullDark : brandFullLight}
                  alt="Ayunis Logo"
                  className="w-full max-w-32"
                />
              </Link>
              <ReleaseNotesButton />
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
                    item.exact
                      ? location.pathname === item.url
                      : location.pathname.startsWith(item.url)
                  }
                >
                  <Link
                    to={item.url}
                    data-testid={NAVIGATION_TEST_IDS[item.url]}
                    // `disabled` is inert on an anchor; the sidebar variants
                    // style aria-disabled and block pointer events for us.
                    aria-disabled={item.disabled}
                  >
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
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={
                  academyAddonActive && location.pathname.startsWith('/academy')
                }
              >
                {academyAddonActive ? (
                  <Link to="/academy">
                    <GraduationCap />
                    <span>{t('sidebar.academy')}</span>
                  </Link>
                ) : (
                  <a
                    href={ACADEMY_LANDING_PAGE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <GraduationCap />
                    <span>{t('sidebar.academy')}</span>
                  </a>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <FavoritesSidebarGroup />
        <ChatsSidebarGroup />
      </SidebarContent>

      <SidebarFooter data-testid="sidebar-footer">
        <OnboardingCard />
        <SidebarMenu>
          {/* Not tied to manage_routines: notifications stay readable without it. */}
          {routinesEnabled && (
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
                <SidebarMenuBadge data-testid="sidebar-inbox-unread-count">
                  {unreadBadge}
                </SidebarMenuBadge>
              )}
            </SidebarMenuItem>
          )}
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
                  <Link to="/settings/general">
                    <User2 />
                    {t('sidebar.accountSettings')}
                  </Link>
                </DropdownMenuItem>
                {canOpenSettings && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin-settings">
                      <Settings2 />
                      {t('sidebar.adminSettings')}
                    </Link>
                  </DropdownMenuItem>
                )}
                {user?.systemRole === MeResponseDtoSystemRole.super_admin && (
                  <DropdownMenuItem asChild>
                    <Link to="/super-admin-settings">
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

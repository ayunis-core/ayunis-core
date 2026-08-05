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
  GraduationCap,
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
} from '@ayunis/ui/components/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import { ChatsSidebarGroup } from './ChatsSidebarGroup';
import { useMe } from '../api/useMe';
import { useLogout } from '../api/useLogout';
import { Link, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import useKeyboardShortcut from '@/features/useKeyboardShortcut';
import { useNavigate } from '@tanstack/react-router';
import brandFullLight from '@/shared/assets/brand/brand-full-light.svg';
import brandFullDark from '@/shared/assets/brand/brand-full-dark.svg';
import { useTheme } from '@/features/theme';
import { useSidebar } from '@ayunis/ui/components/sidebar';
import { MeResponseDtoSystemRole } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import config from '@/shared/config';
import { ReleaseNotesButton } from './ReleaseNotesButton';
import { useFeatureToggles } from '@/features/feature-toggles';
import { useMarketplaceConfig } from '@/features/marketplace';
import {
  useMyPermissions,
  allowedSettingsSections,
  createAuthorization,
} from '@/features/permissions';
import {
  useIsAcademyAddonActive,
  useAcademyAccessStatus,
  ACADEMY_LANDING_PAGE_URL,
} from '@/features/academy';
import { OnboardingCard } from './OnboardingCard';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { theme } = useTheme();
  const { user } = useMe();
  const { permissions } = useMyPermissions();
  const authorization = createAuthorization(user?.role, permissions);
  // Admins and managers granted a settings-relevant permission (e.g. team
  // management) get the settings entry point.
  const canOpenSettings = allowedSettingsSections(authorization).length > 0;
  const { logout } = useLogout();
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { closeMobileWithCleanup } = useSidebar();
  const featureToggles = useFeatureToggles();
  const marketplace = useMarketplaceConfig();
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
      // Starting a conversation is a write, so it is blocked without a
      // certificate. Existing chats stay reachable.
      disabled: isAcademyGated,
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
            <div className="flex h-12 items-center justify-between w-full p-2">
              <Link to="/" aria-label="Ayunis Core" className="inline-flex">
                <img
                  src={theme === 'dark' ? brandFullDark : brandFullLight}
                  alt="Ayunis Logo"
                  className="w-full max-w-32"
                />
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
                  <Link
                    to={item.url}
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

        <ChatsSidebarGroup />
      </SidebarContent>

      <SidebarFooter>
        <OnboardingCard />
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
                {canOpenSettings && (
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

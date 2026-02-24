import React from 'react';
import {
  User2,
  BookOpen,
  ChevronUp,
  Settings2,
  LogOut,
  Plus,
  Bot,
  Brain,
  Sparkles,
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
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/shared/ui/shadcn/dropdown-menu';
import { ChatsSidebarGroup } from './ChatsSidebarGroup';
import { useMe } from '../api/useMe';
import { useLogout } from '../api/useLogout';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import useKeyboardShortcut from '@/features/useKeyboardShortcut';
import { useNavigate } from '@tanstack/react-router';
import brandFullLight from '@/shared/assets/brand/brand-full-light.svg';
import brandFullDark from '@/shared/assets/brand/brand-full-dark.svg';
import { useTheme } from '@/features/theme';
import { useSidebar } from '@/shared/ui/shadcn/sidebar';
import { MeResponseDtoSystemRole } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import config from '@/shared/config';
import { ReleaseNotesButton } from './ReleaseNotesButton';
import { useFeatureToggles } from '@/features/feature-toggles';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { theme } = useTheme();
  const { user } = useMe();
  const { logout } = useLogout();
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { closeMobileWithCleanup } = useSidebar();
  const featureToggles = useFeatureToggles();
  useKeyboardShortcut(['j', 'Meta'], () => {
    void navigate({ to: '/chat' });
  });

  // Menu items.
  const items = [
    {
      title: t('sidebar.newChat'),
      url: '/chat',
      icon: Plus,
      shortcut: '⌘J',
    },
    ...(featureToggles.promptsEnabled
      ? [
          {
            title: t('sidebar.prompts'),
            url: '/prompts',
            icon: BookOpen,
          },
        ]
      : []),
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
    <Sidebar {...props} variant="inset" data-testid="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-between w-full">
              <SidebarMenuButton size="lg" asChild className="flex-1">
                <Link to="/">
                  <img
                    src={theme === 'dark' ? brandFullDark : brandFullLight}
                    alt="Ayunis Logo"
                    className="w-full max-w-32"
                  />
                </Link>
              </SidebarMenuButton>
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
                <SidebarMenuButton asChild>
                  <Link to={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                    {item.shortcut && (
                      <DropdownMenuShortcut>
                        {item.shortcut}
                      </DropdownMenuShortcut>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
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

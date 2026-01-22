import {
  ArrowLeft,
  User,
  Users,
  Brain,
  CreditCard,
  Plug,
  BarChart3,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/shared/ui/shadcn/sidebar';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAppControllerIsCloud } from '@/shared/api';

export function AdminSettingsSidebar() {
  const { t } = useTranslation('admin-settings-layout');
  const { data: appConfig } = useAppControllerIsCloud();
  const isCloud = appConfig?.isCloud ?? false;

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <ArrowLeft className="size-4" />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {t('layout.goBack')}
                  </span>
                  <span className="truncate text-xs">
                    {t('layout.returnToMainApp')}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('layout.settings')}</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to={'/admin-settings/users'}>
                  <User />
                  <span>{t('layout.users')}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to={'/admin-settings/teams'}>
                  <Users />
                  <span>{t('layout.teams')}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to={'/admin-settings/models'}>
                  <Brain />
                  <span>{t('layout.models')}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to={'/admin-settings/integrations'}>
                  <Plug />
                  <span>{t('layout.integrations')}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to={'/admin-settings/billing'}>
                  <CreditCard />
                  <span>{t('layout.billing')}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {!isCloud && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to={'/admin-settings/usage'}>
                    <BarChart3 />
                    <span>{t('layout.usage')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>{/* Footer can be added here if needed */}</SidebarFooter>
    </Sidebar>
  );
}

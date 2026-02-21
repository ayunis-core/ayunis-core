import { ArrowLeft } from 'lucide-react';
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
import type { ReactElement } from 'react';

export interface SidebarMenuItem {
  to: string;
  icon: ReactElement;
  label: string;
}

interface SettingsSidebarWidgetProps {
  translationNamespace: string;
  menuItems: SidebarMenuItem[];
}

export function SettingsSidebarWidget({
  translationNamespace,
  menuItems,
}: Readonly<SettingsSidebarWidgetProps>) {
  const { t } = useTranslation(translationNamespace);

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
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.to}>
                <SidebarMenuButton asChild>
                  <Link to={item.to}>
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}

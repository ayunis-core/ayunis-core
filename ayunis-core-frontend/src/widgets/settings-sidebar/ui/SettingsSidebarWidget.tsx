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
import { Link, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import type { ReactElement } from 'react';

export interface SidebarMenuItem {
  to: string;
  icon: ReactElement;
  label: string;
}

export interface SidebarMenuGroup {
  /** Translation key for the group label, resolved within `translationNamespace`. */
  labelKey: string;
  items: SidebarMenuItem[];
}

interface SettingsSidebarWidgetProps {
  translationNamespace: string;
  /** Flat list rendered under a single "Settings" group. */
  menuItems?: SidebarMenuItem[];
  /** Grouped items, each rendered under its own label. Takes precedence over `menuItems`. */
  groups?: SidebarMenuGroup[];
}

function SidebarItems({
  items,
  pathname,
}: Readonly<{ items: SidebarMenuItem[]; pathname: string }>) {
  return (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.to}>
          <SidebarMenuButton asChild isActive={pathname.startsWith(item.to)}>
            <Link to={item.to}>
              {item.icon}
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

export function SettingsSidebarWidget({
  translationNamespace,
  menuItems,
  groups,
}: Readonly<SettingsSidebarWidgetProps>) {
  const { t } = useTranslation(translationNamespace);
  const location = useLocation();

  const resolvedGroups: SidebarMenuGroup[] = groups ?? [
    { labelKey: 'layout.settings', items: menuItems ?? [] },
  ];

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
        {resolvedGroups.map((group) => (
          <SidebarGroup key={group.labelKey}>
            <SidebarGroupLabel>{t(group.labelKey)}</SidebarGroupLabel>
            <SidebarItems items={group.items} pathname={location.pathname} />
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}

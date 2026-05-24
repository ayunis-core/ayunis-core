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
  useSidebar,
} from '@/shared/ui/shadcn/sidebar';
import { cn } from '@/shared/lib/shadcn/utils';
import { Link, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import type { ReactElement } from 'react';

export interface SidebarMenuItem {
  to: string;
  icon: ReactElement;
  label: string;
}

/** Matches expanded back row (`SidebarMenuButton` size lg). */
const SETTINGS_SIDEBAR_BACK_ROW_CLASS = 'h-12 min-h-12';

interface SettingsSidebarWidgetProps {
  translationNamespace: string;
  menuItems: SidebarMenuItem[];
}

export function SettingsSidebarWidget({
  translationNamespace,
  menuItems,
}: Readonly<SettingsSidebarWidgetProps>) {
  const { t } = useTranslation(translationNamespace);
  const location = useLocation();
  const { isIconCollapsed } = useSidebar();
  const isCollapsed = isIconCollapsed;
  const goBackLabel = t('layout.goBack');

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className={cn(isCollapsed && 'flex justify-center')}>
            <SidebarMenuButton
              size="lg"
              asChild
              tooltip={goBackLabel}
              className={cn(
                SETTINGS_SIDEBAR_BACK_ROW_CLASS,
                'group-data-[collapsible=icon]:!h-12 group-data-[collapsible=icon]:!min-h-12 group-data-[collapsible=icon]:justify-center',
              )}
            >
              <Link to="/" aria-label={goBackLabel}>
                <ArrowLeft className="size-4 shrink-0" />
                <div
                  className={cn(
                    'grid flex-1 text-left text-sm leading-tight',
                    isCollapsed && 'sr-only',
                  )}
                >
                  <span className="truncate font-semibold">{goBackLabel}</span>
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
          <SidebarGroupLabel
            className={cn(
              'group-data-[collapsible=icon]:!mt-0',
              'group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:opacity-0',
            )}
          >
            {t('layout.settings')}
          </SidebarGroupLabel>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.to}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.label}
                  isActive={location.pathname.startsWith(item.to)}
                >
                  <Link to={item.to}>
                    {item.icon}
                    <span className={cn(isCollapsed && 'sr-only')}>
                      {item.label}
                    </span>
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

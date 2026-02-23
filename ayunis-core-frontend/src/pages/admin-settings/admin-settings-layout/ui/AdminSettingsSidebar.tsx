import { User, Users, Brain, Plug, BarChart3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppControllerIsCloud } from '@/shared/api';
import {
  SettingsSidebarWidget,
  type SidebarMenuItem,
} from '@/widgets/settings-sidebar/ui/SettingsSidebarWidget';

export function AdminSettingsSidebar() {
  const { t } = useTranslation('admin-settings-layout');
  const { data: appConfig } = useAppControllerIsCloud();
  const isCloud = appConfig?.isCloud ?? false;

  const menuItems: SidebarMenuItem[] = [
    {
      to: '/admin-settings/users',
      icon: <User />,
      label: t('layout.users'),
    },
    {
      to: '/admin-settings/teams',
      icon: <Users />,
      label: t('layout.teams'),
    },
    {
      to: '/admin-settings/models',
      icon: <Brain />,
      label: t('layout.models'),
    },
    {
      to: '/admin-settings/integrations',
      icon: <Plug />,
      label: t('layout.integrations'),
    },
  ];

  if (!isCloud) {
    menuItems.push({
      to: '/admin-settings/usage',
      icon: <BarChart3 />,
      label: t('layout.usage'),
    });
  }

  return (
    <SettingsSidebarWidget
      translationNamespace="admin-settings-layout"
      menuItems={menuItems}
    />
  );
}

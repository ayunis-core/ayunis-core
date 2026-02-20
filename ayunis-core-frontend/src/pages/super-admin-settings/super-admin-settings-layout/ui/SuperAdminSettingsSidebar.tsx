import { Building2, Brain, BarChart3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  SettingsSidebarWidget,
  type SidebarMenuItem,
} from '@/widgets/settings-sidebar/ui/SettingsSidebarWidget';

export function SuperAdminSettingsSidebar() {
  const { t } = useTranslation('super-admin-settings-layout');

  const menuItems: SidebarMenuItem[] = [
    {
      to: '/super-admin-settings/orgs',
      icon: <Building2 />,
      label: t('layout.orgs'),
    },
    {
      to: '/super-admin-settings/models-catalog',
      icon: <Brain />,
      label: t('layout.modelsCatalog'),
    },
    {
      to: '/super-admin-settings/usage',
      icon: <BarChart3 />,
      label: t('layout.usage'),
    },
  ];

  return (
    <SettingsSidebarWidget
      translationNamespace="super-admin-settings-layout"
      menuItems={menuItems}
    />
  );
}

import {
  Building2,
  Brain,
  Sparkles,
  ShieldCheck,
  Settings2,
  GraduationCap,
  Users,
  Megaphone,
} from 'lucide-react';
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
      to: '/super-admin-settings/users',
      icon: <Users />,
      label: t('layout.users'),
    },
    {
      to: '/super-admin-settings/models-catalog',
      icon: <Brain />,
      label: t('layout.modelsCatalog'),
    },
    {
      to: '/super-admin-settings/skills',
      icon: <Sparkles />,
      label: t('layout.skills'),
    },
    {
      to: '/super-admin-settings/academy',
      icon: <GraduationCap />,
      label: t('layout.academy'),
    },
    {
      to: '/super-admin-settings/super-admins',
      icon: <ShieldCheck />,
      label: t('layout.superAdmins'),
    },
    {
      to: '/super-admin-settings/platform-config',
      icon: <Settings2 />,
      label: t('layout.platformConfig'),
    },
    {
      to: '/super-admin-settings/app-alerts',
      icon: <Megaphone />,
      label: t('layout.appAlerts'),
    },
  ];

  return (
    <SettingsSidebarWidget
      translationNamespace="super-admin-settings-layout"
      menuItems={menuItems}
    />
  );
}

import {
  User,
  Users,
  Brain,
  Plug,
  BarChart3,
  Shield,
  FileText,
  Key,
  Building2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  SettingsSidebarWidget,
  type SidebarMenuItem,
} from '@/widgets/settings-sidebar/ui/SettingsSidebarWidget';
import { useIsLetterheadsEnabled } from '@/features/feature-toggles';

export function AdminSettingsSidebar() {
  const { t } = useTranslation('admin-settings-layout');
  const isLetterheadsEnabled = useIsLetterheadsEnabled();

  const menuItems: SidebarMenuItem[] = [
    {
      to: '/admin-settings/organization',
      icon: <Building2 />,
      label: t('layout.organization'),
    },
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
    {
      to: '/admin-settings/security',
      icon: <Shield />,
      label: t('layout.security'),
    },
    {
      to: '/admin-settings/api-keys',
      icon: <Key />,
      label: t('layout.apiKeys'),
    },
    {
      to: '/admin-settings/usage',
      icon: <BarChart3 />,
      label: t('layout.usage'),
    },
    ...(isLetterheadsEnabled
      ? [
          {
            to: '/admin-settings/letterheads' as const,
            icon: <FileText />,
            label: t('layout.letterheads'),
          },
        ]
      : []),
  ];

  return (
    <SettingsSidebarWidget
      translationNamespace="admin-settings-layout"
      menuItems={menuItems}
    />
  );
}

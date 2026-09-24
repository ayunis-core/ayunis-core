import {
  Building2,
  Brain,
  Sparkles,
  ShieldCheck,
  Settings2,
  GraduationCap,
  Users,
  Megaphone,
  EyeOff,
  ListTree,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  SettingsSidebarWidget,
  type SidebarMenuGroup,
} from '@/widgets/settings-sidebar/ui/SettingsSidebarWidget';
import config from '@/shared/config';

export function SuperAdminSettingsSidebar() {
  const { t } = useTranslation('super-admin-settings-layout');

  const groups: SidebarMenuGroup[] = [
    {
      labelKey: 'layout.settings',
      items: [
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
        {
          to: '/super-admin-settings/anonymization',
          icon: <EyeOff />,
          label: t('layout.anonymization'),
        },
      ],
    },
    {
      labelKey: 'groups.operations',
      items: [
        {
          to: `${config.api.baseUrl.replace(/\/$/, '')}/internal/queues/`,
          external: true,
          testId: 'super-admin-queue-inspection',
          icon: <ListTree />,
          label: t('layout.queueInspection'),
        },
      ],
    },
  ];

  return (
    <SettingsSidebarWidget
      translationNamespace="super-admin-settings-layout"
      groups={groups}
    />
  );
}

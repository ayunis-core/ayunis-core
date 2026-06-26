import {
  User,
  Users,
  Brain,
  Plug,
  BarChart3,
  Shield,
  FileText,
  Key,
  ShieldCheck,
  MessageSquareText,
  Trash2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  SettingsSidebarWidget,
  type SidebarMenuGroup,
} from '@/widgets/settings-sidebar/ui/SettingsSidebarWidget';
import { useIsLetterheadsEnabled } from '@/features/feature-toggles';

export function AdminSettingsSidebar() {
  const { t } = useTranslation('admin-settings-layout');
  const isLetterheadsEnabled = useIsLetterheadsEnabled();

  const groups: SidebarMenuGroup[] = [
    {
      labelKey: 'groups.membersAccess',
      items: [
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
          to: '/admin-settings/api-keys',
          icon: <Key />,
          label: t('layout.apiKeys'),
        },
      ],
    },
    {
      labelKey: 'groups.aiAssistant',
      items: [
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
          to: '/admin-settings/instructions',
          icon: <MessageSquareText />,
          label: t('layout.instructions'),
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
      ],
    },
    {
      labelKey: 'groups.privacyCompliance',
      items: [
        {
          to: '/admin-settings/security',
          icon: <Shield />,
          label: t('layout.security'),
        },
        {
          to: '/admin-settings/anonymization',
          icon: <ShieldCheck />,
          label: t('layout.anonymization'),
        },
        {
          to: '/admin-settings/retention',
          icon: <Trash2 />,
          label: t('layout.retention'),
        },
      ],
    },
    {
      labelKey: 'groups.analytics',
      items: [
        {
          to: '/admin-settings/usage',
          icon: <BarChart3 />,
          label: t('layout.usage'),
        },
      ],
    },
  ];

  return (
    <SettingsSidebarWidget
      translationNamespace="admin-settings-layout"
      groups={groups}
    />
  );
}

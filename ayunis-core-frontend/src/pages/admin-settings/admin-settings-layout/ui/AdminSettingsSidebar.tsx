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
  CreditCard,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  SettingsSidebarWidget,
  type SidebarMenuItem,
} from '@/widgets/settings-sidebar/ui/SettingsSidebarWidget';
import { useIsLetterheadsEnabled } from '@/features/feature-toggles';
import { useSubscriptionsControllerHasActiveSubscription } from '@/shared/api/generated/ayunisCoreAPI';

export function AdminSettingsSidebar() {
  const { t } = useTranslation('admin-settings-layout');
  const isLetterheadsEnabled = useIsLetterheadsEnabled();
  const { data: subscription } =
    useSubscriptionsControllerHasActiveSubscription();
  const isUsageBased = subscription?.subscriptionType === 'USAGE_BASED';

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
    {
      to: '/admin-settings/instructions',
      icon: <MessageSquareText />,
      label: t('layout.instructions'),
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
    ...(isUsageBased
      ? [
          {
            to: '/admin-settings/credit-limits' as const,
            icon: <CreditCard />,
            label: t('layout.creditLimits'),
          },
        ]
      : []),
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

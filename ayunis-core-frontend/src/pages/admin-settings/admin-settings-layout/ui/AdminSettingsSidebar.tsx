import {
  User,
  Users,
  Brain,
  Plug,
  BarChart3,
  Shield,
  FileText,
  KeyRound,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  ActiveSubscriptionResponseDtoSubscriptionType,
  useSubscriptionsControllerHasActiveSubscription,
} from '@/shared/api';
import {
  SettingsSidebarWidget,
  type SidebarMenuItem,
} from '@/widgets/settings-sidebar/ui/SettingsSidebarWidget';
import { useIsLetterheadsEnabled } from '@/features/feature-toggles';

export function AdminSettingsSidebar() {
  const { t } = useTranslation('admin-settings-layout');
  const { data: subscriptionData } =
    useSubscriptionsControllerHasActiveSubscription();
  const isUsageBased =
    subscriptionData?.subscriptionType ===
    ActiveSubscriptionResponseDtoSubscriptionType.USAGE_BASED;
  const isLetterheadsEnabled = useIsLetterheadsEnabled();

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
      to: '/admin-settings/api-keys',
      icon: <KeyRound />,
      label: t('layout.apiKeys'),
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

  if (isUsageBased) {
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

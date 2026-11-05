import {
  Brain,
  Compass,
  MessageSquare,
  Plug,
  Settings,
  User,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  SettingsSidebarWidget,
  type SidebarMenuItem,
} from '@/widgets/settings-sidebar/ui/SettingsSidebarWidget';
import { useMemorySettingsAvailable } from '@/pages/settings/settings-layout/api/useMemorySettingsAvailable';

export function SettingsSidebar() {
  const { t } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');
  const { isMemoryAvailable } = useMemorySettingsAvailable();

  const menuItems: SidebarMenuItem[] = [
    {
      to: '/settings/general',
      icon: <Settings />,
      label: t('layout.general'),
    },
    {
      to: '/settings/chat',
      icon: <MessageSquare />,
      label: t('layout.chat'),
    },
    ...(isMemoryAvailable
      ? [
          {
            to: '/settings/memory',
            icon: <Brain />,
            label: t('layout.memory'),
            testId: 'settings-nav-memory',
          },
        ]
      : []),
    {
      to: '/settings/integrations',
      icon: <Plug />,
      label: t('layout.integrations'),
    },
    {
      to: '/settings/account',
      icon: <User />,
      label: t('layout.account'),
    },
    {
      to: '/getting-started',
      icon: <Compass />,
      label: tCommon('sidebar.gettingStarted'),
    },
  ];

  return (
    <SettingsSidebarWidget
      translationNamespace="settings"
      menuItems={menuItems}
    />
  );
}

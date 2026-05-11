import { Compass, MessageSquare, Settings, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  SettingsSidebarWidget,
  type SidebarMenuItem,
} from '@/widgets/settings-sidebar/ui/SettingsSidebarWidget';

export function SettingsSidebar() {
  const { t } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');

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
    {
      to: '/settings/account',
      icon: <User />,
      label: t('layout.account'),
    },
    {
      to: '/settings/getting-started',
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

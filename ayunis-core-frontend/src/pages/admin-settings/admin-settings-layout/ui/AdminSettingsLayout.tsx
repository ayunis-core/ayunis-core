import AppLayout from '@/layouts/app-layout/ui/AppLayout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { AdminSettingsSidebar } from '@/pages/admin-settings/admin-settings-layout/ui/AdminSettingsSidebar';
import { useTranslation } from 'react-i18next';

interface SettingsLayoutProps {
  children: React.ReactNode;
  action?: React.ReactNode;
  title?: string;
}

export default function SettingsLayout({
  children,
  action,
  title,
}: SettingsLayoutProps) {
  const { t } = useTranslation('admin-settings-layout');
  const contentHeader = (
    <ContentAreaHeader title={title ?? t('layout.title')} action={action} />
  );

  return (
    <AppLayout sidebar={<AdminSettingsSidebar />}>
      <ContentAreaLayout contentHeader={contentHeader} contentArea={children} />
    </AppLayout>
  );
}

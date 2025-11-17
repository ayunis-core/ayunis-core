import AppLayout from '@/layouts/app-layout/ui/AppLayout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { SuperAdminSettingsSidebar } from './SuperAdminSettingsSidebar';
import { useTranslation } from 'react-i18next';

interface SuperAdminSettingsLayoutProps {
  pageTitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export default function SuperAdminSettingsLayout({
  pageTitle,
  children,
  action,
}: SuperAdminSettingsLayoutProps) {
  const { t } = useTranslation('super-admin-settings-layout');
  const contentHeader = (
    <ContentAreaHeader title={pageTitle || t('layout.title')} action={action} />
  );

  return (
    <AppLayout sidebar={<SuperAdminSettingsSidebar />}>
      <ContentAreaLayout contentHeader={contentHeader} contentArea={children} />
    </AppLayout>
  );
}

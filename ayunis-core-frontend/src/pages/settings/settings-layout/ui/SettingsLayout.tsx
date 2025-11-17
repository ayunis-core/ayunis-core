import AppLayout from '@/layouts/app-layout/ui/AppLayout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { SettingsSidebar } from '@/pages/settings/settings-layout/ui/SettingsSidebar';

interface SettingsLayoutProps {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export default function SettingsLayout({
  title,
  children,
  action,
}: SettingsLayoutProps) {
  const contentHeader = <ContentAreaHeader title={title} action={action} />;

  return (
    <AppLayout sidebar={<SettingsSidebar />}>
      <ContentAreaLayout contentHeader={contentHeader} contentArea={children} />
    </AppLayout>
  );
}

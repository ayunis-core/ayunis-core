import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { SettingsSidebar } from '@/pages/settings/settings-layout/ui/SettingsSidebar';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import GettingStartedContent from './GettingStartedContent';
import ShimmerDots from './ShimmerDots';

export default function SettingsGettingStartedPage() {
  const { t } = useTranslation('getting-started');

  return (
    <AppLayout sidebar={<SettingsSidebar />}>
      <ShimmerDots />
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            breadcrumbs={[{ label: t('page.title') }]}
            action={<HelpLink path="getting-started/" />}
          />
        }
        contentArea={<GettingStartedContent />}
      />
    </AppLayout>
  );
}

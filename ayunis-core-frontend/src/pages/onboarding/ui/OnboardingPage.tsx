import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import OnboardingContent from './OnboardingContent';
import OnboardingShimmerDots from './OnboardingShimmerDots';

export default function OnboardingPage() {
  const { t } = useTranslation('getting-started');

  return (
    <AppLayout>
      <OnboardingShimmerDots />
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            breadcrumbs={[{ label: t('page.title') }]}
            action={<HelpLink path="getting-started/" />}
          />
        }
        contentArea={<OnboardingContent />}
      />
    </AppLayout>
  );
}

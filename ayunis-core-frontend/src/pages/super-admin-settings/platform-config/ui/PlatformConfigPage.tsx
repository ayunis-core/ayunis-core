import { useTranslation } from 'react-i18next';
import { useIsFeatureEnabled } from '@/features/feature-toggles';
import SuperAdminSettingsLayout from '@/pages/super-admin-settings/super-admin-settings-layout';
import AcademyMinimumModuleSecondsSection from './AcademyMinimumModuleSecondsSection';
import CreditsPerEuroSection from './CreditsPerEuroSection';
import FairUseLimitsSection from './FairUseLimitsSection';
import ImageGenerationFairUseSection from './ImageGenerationFairUseSection';
import RecordingFairUseSection from './RecordingFairUseSection';

export default function PlatformConfigPage() {
  const { t } = useTranslation('super-admin-settings-platform-config');
  const recordingsEnabled = useIsFeatureEnabled('recordingsEnabled');

  return (
    <SuperAdminSettingsLayout pageTitle={t('title')}>
      <div className="space-y-6">
        <CreditsPerEuroSection />
        <FairUseLimitsSection />
        <ImageGenerationFairUseSection />
        {recordingsEnabled && <RecordingFairUseSection />}
        <AcademyMinimumModuleSecondsSection />
      </div>
    </SuperAdminSettingsLayout>
  );
}

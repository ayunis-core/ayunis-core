import { useTranslation } from 'react-i18next';
import SuperAdminSettingsLayout from '@/pages/super-admin-settings/super-admin-settings-layout';
import AcademyMinimumModuleSecondsSection from './AcademyMinimumModuleSecondsSection';
import CreditsPerEuroSection from './CreditsPerEuroSection';
import FairUseLimitsSection from './FairUseLimitsSection';
import ImageGenerationFairUseSection from './ImageGenerationFairUseSection';

export default function PlatformConfigPage() {
  const { t } = useTranslation('super-admin-settings-platform-config');

  return (
    <SuperAdminSettingsLayout pageTitle={t('title')}>
      <div className="space-y-6">
        <CreditsPerEuroSection />
        <FairUseLimitsSection />
        <ImageGenerationFairUseSection />
        <AcademyMinimumModuleSecondsSection />
      </div>
    </SuperAdminSettingsLayout>
  );
}

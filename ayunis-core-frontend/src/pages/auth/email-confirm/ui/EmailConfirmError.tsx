import OnboardingLayout from '@/layouts/onboarding-layout';
import { Button } from '@ayunis/ui/components/button';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

export default function EmailConfirmError() {
  const { t } = useTranslation('auth');
  return (
    <OnboardingLayout
      title={t('emailConfirm.errorTitle')}
      description={t('emailConfirm.errorDescription')}
    >
      <div className="flex justify-center">
        <Link to="/email-confirm">
          <Button variant="outline">{t('emailConfirm.errorButton')}</Button>
        </Link>
      </div>
    </OnboardingLayout>
  );
}

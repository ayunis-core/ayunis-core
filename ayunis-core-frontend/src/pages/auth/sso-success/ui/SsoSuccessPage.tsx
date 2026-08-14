import { CircleCheck } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import OnboardingLayout from '@/layouts/onboarding-layout';

export function SsoSuccessPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();

  useEffect(() => {
    void navigate({ to: '/chat', replace: true });
  }, [navigate]);

  return (
    <OnboardingLayout
      title={t('sso.success.title')}
      description={t('sso.success.description')}
    >
      <CircleCheck
        aria-label={t('sso.success.loading')}
        className="mx-auto size-10 text-primary"
      />
    </OnboardingLayout>
  );
}

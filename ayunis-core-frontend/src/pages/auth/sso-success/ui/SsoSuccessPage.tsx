import { CircleCheck } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import OnboardingLayout from '@/layouts/onboarding-layout';
import {
  rememberSuccessfulSsoLogin,
  takeSsoPostLoginPath,
} from '@/features/sso';

export function SsoSuccessPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const postLoginPath = useRef<string | null>(null);

  useEffect(() => {
    if (postLoginPath.current === null) {
      rememberSuccessfulSsoLogin();
      postLoginPath.current = takeSsoPostLoginPath();
    }
    void navigate({ to: postLoginPath.current, replace: true });
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

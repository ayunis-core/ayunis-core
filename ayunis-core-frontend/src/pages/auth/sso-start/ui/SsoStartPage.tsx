import { LoaderCircle } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { beginSso } from '@/features/sso';
import OnboardingLayout from '@/layouts/onboarding-layout';

interface SsoStartPageProps {
  orgId: string;
}

export function SsoStartPage({ orgId }: Readonly<SsoStartPageProps>) {
  const { t } = useTranslation('auth');

  useEffect(() => beginSso(orgId), [orgId]);

  return (
    <OnboardingLayout
      title={t('sso.start.title')}
      description={t('sso.start.description')}
    >
      <LoaderCircle
        aria-label={t('sso.start.loading')}
        className="mx-auto size-8 animate-spin text-primary"
      />
    </OnboardingLayout>
  );
}

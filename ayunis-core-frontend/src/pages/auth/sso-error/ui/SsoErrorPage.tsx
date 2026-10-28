import { Button } from '@ayunis/ui/components/button';
import { Link } from '@tanstack/react-router';
import { TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { resolveSsoError } from '@/features/sso';
import OnboardingLayout from '@/layouts/onboarding-layout';

interface SsoErrorPageProps {
  code?: string;
}

export function SsoErrorPage({ code }: Readonly<SsoErrorPageProps>) {
  const { t } = useTranslation('auth');
  const errorKind = resolveSsoError(code);

  return (
    <OnboardingLayout
      title={t('sso.error.title')}
      description={t(`sso.error.messages.${errorKind}`)}
    >
      <div className="flex flex-col items-center gap-6 text-center">
        <TriangleAlert className="size-10 text-destructive" />
        <div className="flex w-full flex-col gap-3">
          <Button asChild>
            <Link to="/login">{t('sso.error.backToLogin')}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/password/forgot">{t('sso.error.resetPassword')}</Link>
          </Button>
        </div>
      </div>
    </OnboardingLayout>
  );
}

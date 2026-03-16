import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/shared/ui/shadcn/button';
import OnboardingLayout from '@/layouts/onboarding-layout';

export function IpBlockedPage() {
  const { t } = useTranslation('auth');

  return (
    <OnboardingLayout
      title={t('ipBlocked.title')}
      description={t('ipBlocked.description')}
    >
      <div className="flex flex-col items-center space-y-6 text-center">
        <div className="flex justify-center">
          <ShieldAlert className="h-16 w-16 text-destructive" />
        </div>
        <Button asChild variant="outline">
          <Link to="/login">{t('ipBlocked.backToLogin')}</Link>
        </Button>
      </div>
    </OnboardingLayout>
  );
}

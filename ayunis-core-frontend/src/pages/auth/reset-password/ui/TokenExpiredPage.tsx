import { Button } from '@/shared/ui/shadcn/button';
import OnboardingLayout from '@/layouts/onboarding-layout';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { AlertCircle } from 'lucide-react';

export function TokenExpiredPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();

  const handleRequestNewLink = () => {
    void navigate({ to: '/password/forgot' });
  };

  return (
    <OnboardingLayout
      title={t('resetPassword.tokenExpired.title')}
      description={t('resetPassword.tokenExpired.description')}
    >
      <div className="flex flex-col items-center space-y-6 text-center">
        <div className="rounded-full bg-destructive/10 p-3">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <p className="text-sm text-muted-foreground">
          {t('resetPassword.tokenExpired.message')}
        </p>
        <Button onClick={handleRequestNewLink} className="w-full">
          {t('resetPassword.tokenExpired.requestNewLink')}
        </Button>
      </div>
    </OnboardingLayout>
  );
}

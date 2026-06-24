import { Button } from '@/shared/ui/shadcn/button';
import OnboardingLayout from '@/layouts/onboarding-layout';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { AlertCircle } from 'lucide-react';

interface Props {
  mode: 'activation' | 'reset';
}

export function TokenExpiredPage({ mode }: Readonly<Props>) {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const prefix = mode === 'activation' ? 'activateAccount' : 'resetPassword';

  const handleRequestNewLink = () => {
    void navigate({ to: '/password/forgot' });
  };

  return (
    <OnboardingLayout
      title={t(`${prefix}.tokenExpired.title`)}
      description={t(`${prefix}.tokenExpired.description`)}
    >
      <div className="flex flex-col items-center space-y-6 text-center">
        <div className="rounded-full bg-destructive/10 p-3">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <p className="text-sm text-muted-foreground">
          {t(`${prefix}.tokenExpired.message`)}
        </p>
        <Button onClick={handleRequestNewLink} className="w-full">
          {t(`${prefix}.tokenExpired.requestNewLink`)}
        </Button>
      </div>
    </OnboardingLayout>
  );
}

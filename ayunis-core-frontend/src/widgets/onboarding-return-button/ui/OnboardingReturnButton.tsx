import { useNavigate, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/shared/ui/shadcn/button';
import { useOnboardingTour } from '@/features/onboarding-tour';
import { useOnboarding } from '@/features/onboarding-progress';

const ONBOARDING_PATH = '/getting-started';

export function OnboardingReturnButton() {
  const { t } = useTranslation('getting-started');
  const navigate = useNavigate();
  const location = useLocation();
  const { isTourActive } = useOnboardingTour();
  const { hidden, isLoading } = useOnboarding();

  const show =
    !isLoading &&
    !hidden &&
    !isTourActive &&
    location.pathname !== ONBOARDING_PATH;

  if (!show) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button size="sm" onClick={() => void navigate({ to: ONBOARDING_PATH })}>
        <ArrowLeft />
        {t('returnButton')}
      </Button>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, X } from 'lucide-react';
import { Button } from '@/shared/ui/shadcn/button';

const STEP_KEY = 'getting-started-pending-step';
const TARGET_KEY = 'getting-started-target-path';

export function GettingStartedPill() {
  const { t } = useTranslation('getting-started');
  const navigate = useNavigate();
  const location = useLocation();
  const [dismissed, setDismissed] = useState(false);

  const pendingStep = sessionStorage.getItem(STEP_KEY);
  const target = sessionStorage.getItem(TARGET_KEY);

  const visible =
    !dismissed &&
    !!pendingStep &&
    location.pathname !== '/getting-started' &&
    (!target || location.pathname === target);

  if (!visible) {
    return null;
  }

  const handleDismiss = () => {
    sessionStorage.removeItem(STEP_KEY);
    sessionStorage.removeItem(TARGET_KEY);
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-1">
      <Button
        size="sm"
        onClick={() => void navigate({ to: '/getting-started' })}
      >
        <ArrowLeft />
        {t('returnPill')}
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={handleDismiss}
        aria-label="Dismiss"
      >
        <X />
      </Button>
    </div>
  );
}

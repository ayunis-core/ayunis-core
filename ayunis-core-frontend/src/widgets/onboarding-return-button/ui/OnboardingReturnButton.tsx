import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, X } from 'lucide-react';
import { Button } from '@/shared/ui/shadcn/button';
import { useOnboardingTour } from '@/features/onboarding-tour';
import {
  clearPendingStep,
  usePendingStep,
} from '@/features/onboarding-progress';

const REVEAL_DELAY_MS = 300;

export function OnboardingReturnButton() {
  const { t } = useTranslation('getting-started');
  const navigate = useNavigate();
  const location = useLocation();
  const [dismissed, setDismissed] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const { isTourActive } = useOnboardingTour();
  const pendingStep = usePendingStep();

  // Hold off the pill for a beat after the destination page mounts so it
  // doesn't pop in at the same instant as the route transition.
  const originPath = pendingStep?.originPath ?? '/getting-started';
  const onTargetPath =
    !!pendingStep &&
    location.pathname !== originPath &&
    (!pendingStep.targetPath || location.pathname === pendingStep.targetPath);

  // Reveal key changes per step+path; the timeout flips revealedKey to match,
  // and `revealed` is derived from the comparison. Avoids syncing state inside
  // the effect when onTargetPath flips back to false.
  const showKey = onTargetPath
    ? `${pendingStep.stepId}:${location.pathname}`
    : null;
  const revealed = showKey !== null && revealedKey === showKey;

  useEffect(() => {
    if (showKey === null) return;
    const id = setTimeout(() => setRevealedKey(showKey), REVEAL_DELAY_MS);
    return () => clearTimeout(id);
  }, [showKey]);

  const mounted = !dismissed && !isTourActive && onTargetPath;

  if (!mounted) {
    return null;
  }

  const handleDismiss = () => {
    clearPendingStep();
    setDismissed(true);
  };

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-1 transition-all duration-200 ease-out"
      style={{
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'translateY(0)' : 'translateY(8px)',
        // Prevent accidental clicks while hidden during the reveal delay window
        pointerEvents: revealed ? 'auto' : 'none',
      }}
      aria-hidden={!revealed}
    >
      <Button
        size="sm"
        disabled={!revealed}
        onClick={() => void navigate({ to: '/getting-started' })}
      >
        <ArrowLeft />
        {t('returnButton')}
      </Button>
      <Button
        size="icon"
        variant="ghost"
        disabled={!revealed}
        onClick={handleDismiss}
        aria-label="Dismiss"
      >
        <X />
      </Button>
    </div>
  );
}

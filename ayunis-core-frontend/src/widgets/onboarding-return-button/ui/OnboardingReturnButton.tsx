import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, X } from 'lucide-react';
import { Button } from '@/shared/ui/shadcn/button';
import { subscribeTourActive } from '@/features/onboarding-tour';
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
  const [tourActive, setTourActive] = useState(false);
  const pendingStep = usePendingStep();

  useEffect(() => subscribeTourActive(setTourActive), []);

  // Hold off the pill for a beat after the destination page mounts so it
  // doesn't pop in at the same instant as the route transition.
  const originPath = pendingStep?.originPath ?? '/getting-started';
  const normalizePath = (path: string): string => {
    if (path === '/') return '/';
    return path.replace(/\/+$/, '');
  };
  const currentPath = normalizePath(location.pathname);
  const normalizedOrigin = normalizePath(originPath);
  const normalizedTarget = pendingStep?.targetPath
    ? normalizePath(pendingStep.targetPath)
    : null;
  const onTargetPath =
    !!pendingStep &&
    currentPath !== normalizedOrigin &&
    (!normalizedTarget || currentPath === normalizedTarget);

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

  const mounted = !dismissed && !tourActive && onTargetPath;

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
      }}
    >
      <Button
        size="sm"
        onClick={() =>
          void navigate(
            originPath === '/settings/getting-started'
              ? { to: '/settings/getting-started' }
              : { to: '/getting-started' },
          )
        }
      >
        <ArrowLeft />
        {t('returnButton')}
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

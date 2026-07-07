import { useEffect, useState } from 'react';

// Targets that animate into place carry their settle time on `data-tour-settle`
// (see <OnboardingTourTarget settleMs>). Joyride measures the target rect once
// when the run starts and never recomputes it, so for animated targets we hold
// the run for that long, leaving the spotlight on the final position. Targets
// with no settle time run immediately. Whether the target actually exists is
// left to joyride (its targetWaitTimeout fires TARGET_NOT_FOUND), so a missing
// target ends the tour instead of hanging here.
export function useStableTarget(target: string): boolean {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const el = document.querySelector(`[data-tour="${target}"]`);
    const settleMs = el ? Number(el.getAttribute('data-tour-settle')) || 0 : 0;
    const timer = window.setTimeout(() => setIsReady(true), settleMs);

    return () => window.clearTimeout(timer);
  }, [target]);

  return isReady;
}

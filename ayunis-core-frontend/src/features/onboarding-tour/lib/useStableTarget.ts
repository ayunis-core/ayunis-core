import { useEffect, useState } from 'react';

// Targets that animate into place carry their settle time on `data-tour-settle`
// (see <OnboardingTourTarget settleMs>). Joyride measures the target rect once
// when the run starts and never recomputes it, so hold the run until the target
// exists and — for animated targets — has settled, leaving the spotlight on the
// final position.
export function useStableTarget(target: string): boolean {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let raf = 0;
    let timer = 0;
    let cancelled = false;
    const selector = `[data-tour="${target}"]`;

    const waitForTarget = () => {
      const el = document.querySelector(selector);
      if (!el) {
        raf = requestAnimationFrame(waitForTarget);
        return;
      }
      const settleMs = Number(el.getAttribute('data-tour-settle')) || 0;
      timer = window.setTimeout(() => {
        if (!cancelled) setIsReady(true);
      }, settleMs);
    };

    waitForTarget();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [target]);

  return isReady;
}

import { useEffect, useState } from 'react';

// Targets that animate into place carry their settle time on `data-tour-settle`
// (see <OnboardingTourTarget settleMs>). Joyride measures the target rect once
// when the run starts and never recomputes it, so hold the run until the target
// exists and — for animated targets — has settled, leaving the spotlight on the
// final position.
const MAX_WAIT_MS = 2000; // Give up waiting after this to let Joyride emit TARGET_NOT_FOUND
export function useStableTarget(target: string): boolean {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let raf = 0;
    let timer = 0;
    let deadline = 0;
    let cancelled = false;
    const selector = `[data-tour="${target}"]`;

    const waitForTarget = () => {
      if (cancelled) return;
      const el = document.querySelector(selector);
      if (!el) {
        raf = requestAnimationFrame(waitForTarget);
        return;
      }
      const settleMs = Number(el.getAttribute('data-tour-settle')) || 0;
      // Target found — no need for the global deadline anymore.
      window.clearTimeout(deadline);
      timer = window.setTimeout(() => {
        if (!cancelled) setIsReady(true);
      }, settleMs);
    };

    // Global deadline: if the target never appears, allow Joyride to start so it
    // can emit TARGET_NOT_FOUND and end the tour gracefully instead of hanging.
    deadline = window.setTimeout(() => {
      if (cancelled) return;
      cancelled = true; // stop further polling
      cancelAnimationFrame(raf);
      setIsReady(true);
    }, MAX_WAIT_MS);

    waitForTarget();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      window.clearTimeout(deadline);
    };
  }, [target]);

  return isReady;
}
